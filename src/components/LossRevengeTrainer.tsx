import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  RotateCcw,
  Undo2,
  Swords,
  CheckCircle2,
  Compass,
  ArrowRight,
  BookOpen,
  Volume2,
  VolumeX,
  History,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import type { ChessComGame } from '../types/chess';
import { identifyOpeningFromMoves } from '../services/openingNames';
import { stockfishEngine } from '../services/stockfishEngine';
import { soundService } from '../services/soundService';
import { explainBlunderWithGemini } from '../services/geminiCoach';
import { parsePgnMoves } from '../services/chesscom';

export interface PredefinedLossDrill {
  id: string;
  title: string;
  subtitle: string;
  playerColor: 'white' | 'black';
  initialMoves: string[]; // e.g. ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7']
  criticalMoveNumber: number;
  yourPastBlunder: string;
  strategicGoal: string;
  recommendedMove: string;
  explanation: string;
}

const PREDEFINED_DRILLS: PredefinedLossDrill[] = [
  {
    id: 'englund_queen_trap',
    title: 'Gambito Englund (183 Derrotas Reales)',
    subtitle: '1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7',
    playerColor: 'white',
    initialMoves: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7'],
    criticalMoveNumber: 4,
    yourPastBlunder: 'Bf4 (o colgar peón de b2 tras Qb4+)',
    strategicGoal: 'Desarrolla 4. Nc3! o 4. Bf4 pero responde a 4... Qb4+ con 5. Bd2! sin entrar en pánico por b2.',
    recommendedMove: 'Nc3',
    explanation: 'El rival busca cazar tu alfil o tu torre en a1 tras Qb4+. Al jugar 4. Nc3 defiendes e4, desarrollas una pieza menor y preparas tu enroque.',
  },
  {
    id: 'sicilian_alapin',
    title: 'Siciliana Alapin (39% de Victorias)',
    subtitle: '1. e4 c5 2. c3 (El Blanco prepara d4)',
    playerColor: 'black',
    initialMoves: ['e4', 'c5', 'c3'],
    criticalMoveNumber: 2,
    yourPastBlunder: 'Jugar pasivo con d6 o e6 permitiendo 3. d4',
    strategicGoal: '¡Golpea el centro ya! Juega 2... d5! aprovechando que el caballo blanco no puede salir a c3.',
    recommendedMove: 'd5',
    explanation: 'En la variante Alapin no debes esperar. Con 2... d5 obligas al blanco a definir el centro de inmediato y ganas iniciativa para tus piezas.',
  },
  {
    id: 'kings_indian_castling',
    title: 'Setup Flanco Rey ante 1. d4 (155 Derrotas)',
    subtitle: '1. d4 d6 2. c4 Nf6 3. Nc3 g6',
    playerColor: 'black',
    initialMoves: ['d4', 'd6', 'c4', 'Nf6', 'Nc3', 'g6'],
    criticalMoveNumber: 4,
    yourPastBlunder: 'Mover la dama prematuramente antes de asegurar el rey',
    strategicGoal: 'Completa tu plan: 4... Bg7 y 5... O-O de inmediato. Luego romperás con e5.',
    recommendedMove: 'Bg7',
    explanation: 'La regla de oro en este setup: el rey debe estar enrocado antes de abrir cualquier línea. No toques peones laterales hasta estar a salvo.',
  },
];

export interface LossRevengeTrainerProps {
  games: ChessComGame[];
  initialFen?: string;
  initialColor?: 'white' | 'black';
  lineName?: string;
  onClearCustomLine?: () => void;
  onInspectGame?: (game: ChessComGame) => void;
}

export const LossRevengeTrainer: React.FC<LossRevengeTrainerProps> = ({
  games,
  initialFen,
  initialColor = 'white',
  lineName,
  onClearCustomLine,
  onInspectGame,
}) => {
  const [activeMode, setActiveMode] = useState<'presets' | 'real_losses'>('presets');
  const [selectedDrill, setSelectedDrill] = useState<PredefinedLossDrill | null>(PREDEFINED_DRILLS[0]);
  const [activeRealGame, setActiveRealGame] = useState<ChessComGame | null>(null);

  const [game, setGame] = useState<Chess>(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>(initialColor);
  const [difficultyElo, setDifficultyElo] = useState<number>(1400);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargetSquares, setLegalTargetSquares] = useState<Square[]>([]);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [geminiAdvice, setGeminiAdvice] = useState<string>('');
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundService.enabled);

  // Extract user's real losses in 1. d4, 1... c5 and 1... d6
  const realLossGames = useMemo(() => {
    return games
      .filter((g) => {
        if (g.userWon) return false;
        const isDraw = g.white.result !== 'win' && g.black.result !== 'win';
        if (isDraw) return false;
        const m = g.moves || [];
        if (m.length < 4) return false;
        // White 1. d4 losses
        if (g.userColor === 'white' && m[0]?.san === 'd4') return true;
        // Black vs 1. e4 with 1... c5 losses
        if (g.userColor === 'black' && m[0]?.san === 'e4' && m[1]?.san === 'c5') return true;
        // Black vs 1. d4 with 1... d6 / d5 losses
        if (g.userColor === 'black' && m[0]?.san === 'd4') return true;
        return false;
      })
      .slice(0, 35);
  }, [games]);

  // Load a predefined drill
  const loadDrill = useCallback((drill: PredefinedLossDrill) => {
    setSelectedDrill(drill);
    setActiveRealGame(null);
    const newGame = new Chess();
    const history: string[] = [];

    for (const san of drill.initialMoves) {
      try {
        newGame.move(san);
        history.push(san);
      } catch {
        break;
      }
    }

    setGame(newGame);
    setMoveHistory(history);
    setPlayerColor(drill.playerColor);
    setSelectedSquare(null);
    setLegalTargetSquares([]);
    setStatusMessage('');
    setGeminiAdvice('');
  }, []);

  // Load a real game from the database
  const loadRealLossGame = useCallback((targetGame: ChessComGame) => {
    setActiveRealGame(targetGame);
    setSelectedDrill(null);

    const parsed = parsePgnMoves(targetGame.pgn);
    const newGame = new Chess();
    const history: string[] = [];

    // Play moves up to move 6 (ply 12) or the user's turn around ply 8
    const maxPlies = Math.min(10, parsed.length - 1);
    for (let i = 0; i < maxPlies; i++) {
      try {
        newGame.move(parsed[i].san);
        history.push(parsed[i].san);
      } catch {
        break;
      }
    }

    // Ensure it is user's turn
    const expectedTurn = targetGame.userColor === 'white' ? 'w' : 'b';
    if (newGame.turn() !== expectedTurn && parsed[maxPlies]) {
      try {
        newGame.move(parsed[maxPlies].san);
        history.push(parsed[maxPlies].san);
      } catch {
        // ignore
      }
    }

    setGame(newGame);
    setMoveHistory(history);
    setPlayerColor(targetGame.userColor);
    setSelectedSquare(null);
    setLegalTargetSquares([]);
    setStatusMessage(`Revancha vs ${targetGame.userColor === 'white' ? targetGame.black.username : targetGame.white.username}. ¡Juega y supera tu error!`);
    setGeminiAdvice('');
  }, []);

  // Handle custom initial FEN (from Repertoire tree or Game Inspector)
  useEffect(() => {
    if (initialFen) {
      try {
        const newGame = new Chess(initialFen);
        setGame(newGame);
        setMoveHistory([]);
        setPlayerColor(initialColor);
        setSelectedDrill(null);
        setActiveRealGame(null);
        setSelectedSquare(null);
        setLegalTargetSquares([]);
        setStatusMessage(`Entrenando posición personalizada: ${lineName || 'Posición clave'}`);
        setGeminiAdvice('');
      } catch {
        // invalid fen fallback
      }
    } else {
      loadDrill(PREDEFINED_DRILLS[0]);
    }
  }, [initialFen, initialColor, lineName, loadDrill]);

  // Real-time opening name and variation badge
  const currentOpening = useMemo(() => {
    return identifyOpeningFromMoves(moveHistory);
  }, [moveHistory]);

  const isPlayerTurn =
    (game.turn() === 'w' && playerColor === 'white') ||
    (game.turn() === 'b' && playerColor === 'black');

  // Trigger Stockfish move on opponent's turn
  useEffect(() => {
    if (!isPlayerTurn && !game.isGameOver()) {
      setIsAiThinking(true);
      const timer = setTimeout(async () => {
        try {
          const depth = difficultyElo <= 800 ? 5 : difficultyElo <= 1400 ? 10 : 16;
          const result = await stockfishEngine.calculateBestMove(game.fen(), difficultyElo, depth);

          const moves = game.moves({ verbose: true });
          if (moves.length === 0) return;

          let chosenMove = moves[0];
          if (result.bestMoveUci) {
            const match = moves.find(
              (m) => `${m.from}${m.to}${m.promotion || ''}` === result.bestMoveUci
            );
            if (match) chosenMove = match;
          }

          game.move(chosenMove);
          setMoveHistory((prev) => [...prev, chosenMove.san]);
          setGame(new Chess(game.fen()));

          if (chosenMove.captured) {
            soundService.playCapture();
          } else if (game.inCheck()) {
            soundService.playCheck();
          } else {
            soundService.playMove();
          }

          if (game.isGameOver()) {
            if (game.isCheckmate()) {
              setStatusMessage('Jaque Mate. La máquina ha ganado esta ronda.');
              soundService.playError();
            } else {
              setStatusMessage('Partida en tablas.');
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsAiThinking(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [game, isPlayerTurn, difficultyElo]);

  // Execute move
  const executeMove = (from: Square, to: Square): boolean => {
    if (!isPlayerTurn || game.isGameOver()) return false;

    try {
      const move = game.move({
        from,
        to,
        promotion: 'q',
      });

      if (!move) return false;

      setMoveHistory((prev) => [...prev, move.san]);
      setGame(new Chess(game.fen()));
      setSelectedSquare(null);
      setLegalTargetSquares([]);

      if (move.captured) {
        soundService.playCapture();
      } else if (game.inCheck()) {
        soundService.playCheck();
      } else {
        soundService.playMove();
      }

      // If user plays recommended drill move
      if (
        selectedDrill &&
        (move.san === selectedDrill.recommendedMove ||
          move.san.replace('+', '').replace('#', '') === selectedDrill.recommendedMove)
      ) {
        setStatusMessage('¡Excelente jugada estratégica! Has ejecutado el plan maestro.');
        soundService.playSuccess();
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      }

      if (game.isGameOver()) {
        if (game.isCheckmate()) {
          setStatusMessage('¡Victoria! ¡Has ganado por Jaque Mate!');
          soundService.playSuccess();
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        }
      }

      return true;
    } catch {
      return false;
    }
  };

  // Drag-and-drop handler
  const onPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    return executeMove(sourceSquare as Square, targetSquare as Square);
  };

  // Click-to-move handler (Tap to select, Tap to move)
  const onSquareClick = (square: Square) => {
    if (!isPlayerTurn || game.isGameOver()) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalTargetSquares([]);
        return;
      }

      if (legalTargetSquares.includes(square)) {
        executeMove(selectedSquare, square);
        return;
      }
    }

    const piece = game.get(square);
    const expectedColor = playerColor === 'white' ? 'w' : 'b';

    if (piece && piece.color === expectedColor && piece.color === game.turn()) {
      setSelectedSquare(square);
      const legalMoves = game.moves({ square, verbose: true });
      setLegalTargetSquares(legalMoves.map((m) => m.to as Square));
    } else {
      setSelectedSquare(null);
      setLegalTargetSquares([]);
    }
  };

  // Custom square styles for visual feedback
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(245, 158, 11, 0.45)',
        borderRadius: '6px',
      };
    }

    for (const target of legalTargetSquares) {
      const pieceOnTarget = game.get(target);
      if (pieceOnTarget) {
        // Enemy piece -> capture target ring
        styles[target] = {
          background: 'radial-gradient(circle, transparent 60%, rgba(239, 68, 68, 0.8) 65%)',
          borderRadius: '50%',
        };
      } else {
        // Empty square -> legal move green dot
        styles[target] = {
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.85) 26%, transparent 27%)',
          borderRadius: '50%',
        };
      }
    }

    return styles;
  }, [selectedSquare, legalTargetSquares, game]);

  // Ask Gemini for strategic coaching
  const handleAskStrategy = async () => {
    setIsGeminiLoading(true);
    setGeminiAdvice('');

    const context = {
      playerColor: playerColor === 'white' ? ('Blanco' as const) : ('Negro' as const),
      fen: game.fen(),
      userMoveSan: moveHistory[moveHistory.length - 1] || 'Inicio',
      bestMoveSan: selectedDrill?.recommendedMove || 'Mejor jugada estratégica',
      evalDropCentipawns: 150,
      tacticTag: 'opening_strategy',
      tacticSummary: `${currentOpening.name}: El objetivo estratégico es ${
        selectedDrill ? selectedDrill.strategicGoal : 'Dominar el centro y asegurar el rey'
      }`,
    };

    const advice = await explainBlunderWithGemini(context);
    setGeminiAdvice(advice);
    setIsGeminiLoading(false);
  };

  const handleResetCurrentPosition = () => {
    if (selectedDrill) {
      loadDrill(selectedDrill);
    } else if (activeRealGame) {
      loadRealLossGame(activeRealGame);
    } else if (initialFen) {
      setGame(new Chess(initialFen));
      setMoveHistory([]);
      setSelectedSquare(null);
      setLegalTargetSquares([]);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Custom incoming line banner */}
      {lineName && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Swords size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Posición Importada del Árbol de Fugas
              </span>
              <h3 className="text-sm font-black text-white">{lineName}</h3>
            </div>
          </div>

          {onClearCustomLine && (
            <button
              onClick={onClearCustomLine}
              className="px-3 py-1.5 bg-[#0f141c] hover:bg-slate-800 text-xs font-bold text-slate-300 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <XCircle size={14} />
              <span>Ver Simulacros Predeterminados</span>
            </button>
          )}
        </div>
      )}

      {/* Main Training Selector & Engine Level */}
      <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Swords size={15} />
                Dojo de Revancha: Juega y Supera tus Derrotas
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                Stockfish 19 UCI
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">
              Adiestramiento de Aperturas y Revancha
            </h2>
          </div>

          {/* Engine Elo Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Nivel IA:</span>
            <select
              value={difficultyElo}
              onChange={(e) => setDifficultyElo(Number(e.target.value))}
              className="bg-[#0f141c] border border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono shadow-inner"
            >
              <option value={800}>Nivel Principiante (800 Elo)</option>
              <option value={1400}>Nivel Club Intermedio (1400 Elo)</option>
              <option value={1800}>Nivel Fuerte / Candidato Maestro (1800 Elo)</option>
              <option value={2400}>Stockfish 19 a Fondo (2400+ Elo)</option>
            </select>
          </div>
        </div>

        {/* Tab switcher: 3 Historical Leaks vs Real Loss Games */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveMode('presets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'presets'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-[#0f141c]'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Tus 3 Peores Dolores de Cabeza</span>
          </button>

          <button
            onClick={() => setActiveMode('real_losses')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'real_losses'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-[#0f141c]'
            }`}
          >
            <History size={14} />
            <span>Tus Partidas Perdidas Reales ({realLossGames.length})</span>
          </button>
        </div>

        {/* Mode 1: Predefined Drills */}
        {activeMode === 'presets' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PREDEFINED_DRILLS.map((d) => (
              <button
                key={d.id}
                onClick={() => loadDrill(d)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedDrill?.id === d.id
                    ? 'bg-rose-950/40 border-rose-500 shadow-md ring-1 ring-rose-500'
                    : 'bg-[#0f141c] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    {d.playerColor === 'white' ? '⚪ Con Blancas' : '⚫ Con Negras'}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-0.5">{d.title}</h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">{d.subtitle}</p>
                </div>
                <div className="mt-2 text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <span>Jugar Revancha</span>
                  <ArrowRight size={12} />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mode 2: Real Lost Games list */}
        {activeMode === 'real_losses' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Selecciona cualquier partida perdida para colocar la posición crítica y jugar contra Stockfish 19 demostrando cómo se debió ganar:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {realLossGames.map((g, idx) => {
                const opponent = g.userColor === 'white' ? g.black : g.white;
                const isSelected = activeRealGame?.url === g.url;

                return (
                  <div
                    key={g.url || idx}
                    onClick={() => loadRealLossGame(g)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between group ${
                      isSelected
                        ? 'bg-rose-950/50 border-rose-500 ring-1 ring-rose-500'
                        : 'bg-[#0f141c] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400">
                          {g.userColor === 'white' ? '⚪ Blancas' : '⚫ Negras'}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          vs. {opponent.username} ({opponent.rating})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {g.time_class} • {g.moves?.slice(0, 4).map((m) => m.san).join(' ') || 'Apertura'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onInspectGame && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectGame(g);
                          }}
                          title="Inspeccionar en el Analizador"
                          className="p-1 hover:text-emerald-400 text-slate-400 rounded transition"
                        >
                          <ExternalLink size={13} />
                        </button>
                      )}
                      <ArrowRight size={14} className="text-emerald-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Board Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Board + Dynamic Opening Name */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Dynamic Opening Name Badge */}
          <div className="w-full max-w-[480px] mb-2 p-2.5 bg-[#18202c] border border-slate-800 rounded-xl flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2 truncate">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Compass size={16} />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">
                  {currentOpening.name}
                </p>
                {currentOpening.eco && (
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    ECO: {currentOpening.eco}
                  </span>
                )}
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0f141c] text-slate-300 font-mono shrink-0">
              Jugada {Math.floor(moveHistory.length / 2) + 1}
            </span>
          </div>

          {/* Interactive Board with Click-to-Move and Drag-to-Drop */}
          <div className="w-full max-w-[480px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-[#222c3c] bg-[#121824]">
            <Chessboard
              options={{
                position: game.fen(),
                boardOrientation: playerColor,
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  targetSquare ? onPieceDrop(sourceSquare, targetSquare) : false,
                onSquareClick: ({ square }) => onSquareClick(square as Square),
                squareStyles: customSquareStyles,
                darkSquareStyle: { backgroundColor: '#648a56' },
                lightSquareStyle: { backgroundColor: '#ece9d8' },
                boardStyle: { borderRadius: '12px' },
              }}
            />
          </div>

          {/* Helper caption for mobile */}
          <p className="text-[11px] text-slate-400 mt-2 font-medium text-center">
            💡 <strong>Toca o arrastra</strong> una pieza para ver sus casillas posibles y mover.
          </p>

          {/* Action Toolbar */}
          <div className="w-full max-w-[480px] flex items-center justify-between mt-2.5 bg-[#18202c] border border-slate-800 rounded-xl p-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  game.undo();
                  game.undo();
                  setGame(new Chess(game.fen()));
                  setMoveHistory((prev) => prev.slice(0, -2));
                }}
                disabled={moveHistory.length < 2}
                className="px-3 py-1.5 bg-[#0f141c] hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-40"
              >
                <Undo2 size={14} />
                <span>Deshacer</span>
              </button>

              <button
                onClick={handleResetCurrentPosition}
                className="px-3 py-1.5 bg-[#0f141c] hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Reiniciar</span>
              </button>
            </div>

            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                soundService.enabled = nextState;
              }}
              className="p-2 text-slate-400 hover:text-white bg-[#0f141c] rounded-lg border border-slate-700 transition"
              title="Sonidos"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* Right Column: Strategic Coach & Mission */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-400" />
                <span>Tu Misión de Apertura</span>
              </h3>
              {isAiThinking && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse font-mono">
                  Stockfish 19 pensando...
                </span>
              )}
            </div>

            {/* Strategic Advice Box */}
            <div className="p-3.5 bg-gradient-to-br from-[#121c27] to-[#0f141c] border border-emerald-500/30 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-emerald-400">Objetivo en esta posición:</p>
              <p className="text-slate-200 leading-relaxed font-medium">
                {selectedDrill
                  ? selectedDrill.strategicGoal
                  : 'Desarrolla tus piezas activamente, controla el centro y asegura la seguridad de tu rey.'}
              </p>
              {selectedDrill && (
                <p className="text-[11px] text-slate-400 leading-normal pt-1 border-t border-slate-800/80">
                  {selectedDrill.explanation}
                </p>
              )}
            </div>

            {/* Past Blunder Warning */}
            {selectedDrill && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-xs space-y-1">
                <p className="font-bold text-rose-300">Tu error común en Chess.com:</p>
                <p className="text-rose-200/90">{selectedDrill.yourPastBlunder}</p>
              </div>
            )}

            {/* Status Messages */}
            {statusMessage && (
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 font-bold flex items-center gap-2 animate-in zoom-in-95">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Ask Gemini Coach Button */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Entrenador Gemini
                </span>

                <button
                  onClick={handleAskStrategy}
                  disabled={isGeminiLoading}
                  className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-50 flex items-center gap-1 shadow-md"
                >
                  <Sparkles size={12} />
                  <span>{isGeminiLoading ? 'Consultando...' : '¿Qué estrategia tomar?'}</span>
                </button>
              </div>

              {geminiAdvice && (
                <div className="p-3 bg-[#0f141c] border border-emerald-500/30 rounded-xl text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {geminiAdvice}
                </div>
              )}
            </div>
          </div>

          {/* Move Sequence Transcript */}
          <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secuencia de Jugadas</h4>
            <div className="flex flex-wrap gap-1.5 text-xs font-mono">
              {moveHistory.length === 0 && (
                <span className="text-slate-500 italic text-[11px]">Esperando primer movimiento...</span>
              )}
              {moveHistory.map((m, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded ${
                    i % 2 === 0 ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
