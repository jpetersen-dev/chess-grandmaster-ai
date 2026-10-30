import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Clock,
  PlusCircle,
  CheckCircle2,
  Brain,
  Zap,
} from 'lucide-react';
import type { ChessComGame, ParsedMove } from '../types/chess';
import { parsePgnMoves } from '../services/chesscom';
import { diagnoseMoveTactics, evaluatePositionRough } from '../services/tacticsClassifier';
import { analyzePosition } from '../services/stockfish';
import { explainBlunderWithGemini } from '../services/geminiCoach';
import { addBlunderToDojo } from '../services/srsStorage';
import { soundService } from '../services/soundService';
import { extractOpeningName } from '../services/repertoireAnalyzer';

interface GameInspectorViewProps {
  game: ChessComGame;
  onBack: () => void;
  onGoToDojo: () => void;
}

export const GameInspectorView: React.FC<GameInspectorViewProps> = ({
  game,
  onBack,
  onGoToDojo,
}) => {
  const [moves, setMoves] = useState<ParsedMove[]>([]);
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [geminiAdvice, setGeminiAdvice] = useState<string>('');
  const [dojoAdded, setDojoAdded] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<'white' | 'black'>(game.userColor);

  // 1. Parse game moves on load
  useEffect(() => {
    const parsed = parsePgnMoves(game.pgn);
    setMoves(parsed);
    setCurrentPly(0);
    setGeminiAdvice('');
    setDojoAdded(false);

    // Auto-analyze game with heuristic/engine
    const runAnalysis = async () => {
      const userTurn = game.userColor === 'white' ? 'w' : 'b';

      for (let i = 0; i < parsed.length; i++) {
        const m = parsed[i];
        const isUser = m.color === userTurn;

        // Approximate evaluation swing
        const roughBefore = evaluatePositionRough(m.fenBefore);
        const roughAfter = evaluatePositionRough(m.fenAfter);

        // From perspective of player who moved:
        const evalBeforeSide = m.color === 'w' ? roughBefore : -roughBefore;
        const evalAfterSide = m.color === 'w' ? roughAfter : -roughAfter;
        const drop = Math.max(0, evalBeforeSide - evalAfterSide);

        m.evalBefore = roughBefore;
        m.evalAfter = roughAfter;
        m.deltaEval = drop;

        const diag = diagnoseMoveTactics(m, isUser, drop);
        m.classification = diag.classification;
        m.tacticTag = diag.tacticTag;
        m.tacticSummary = diag.summary;

        // For blunders, get the real best move from engine
        if (diag.classification === 'blunder' || diag.classification === 'mistake') {
          try {
            const engineResult = await analyzePosition(m.fenBefore);
            m.bestMoveSan = engineResult.bestMoveSan || engineResult.bestMoveUci;
            m.bestMoveUci = engineResult.bestMoveUci;
          } catch {
            // fallback
          }
        }
      }

      setMoves([...parsed]);
    };

    runAnalysis();
  }, [game]);

  // Current FEN
  const currentFen = useMemo(() => {
    if (moves.length === 0 || currentPly === 0) {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    return moves[currentPly - 1].fenAfter;
  }, [moves, currentPly]);

  const currentMove = currentPly > 0 ? moves[currentPly - 1] : null;

  // Jump to specific ply
  const goToPly = useCallback(
    (ply: number) => {
      const target = Math.max(0, Math.min(ply, moves.length));
      setCurrentPly(target);
      setGeminiAdvice('');
      setDojoAdded(false);

      if (target > 0) {
        const m = moves[target - 1];
        if (m.san.includes('x')) {
          soundService.playCapture();
        } else if (m.san.includes('+') || m.san.includes('#')) {
          soundService.playCheck();
        } else {
          soundService.playMove();
        }
      }
    },
    [moves]
  );

  // Request Gemini Grandmaster advice
  const handleAskGemini = async () => {
    if (!currentMove) return;
    setGeminiLoading(true);
    setGeminiAdvice('');

    const advice = await explainBlunderWithGemini({
      playerColor: currentMove.color === 'w' ? 'Blanco' : 'Negro',
      fen: currentMove.fenBefore,
      userMoveSan: currentMove.san,
      bestMoveSan: currentMove.bestMoveSan || 'desarrollo óptimo',
      evalDropCentipawns: currentMove.deltaEval || 200,
      timeSpentSeconds: currentMove.timeSpentSeconds,
      clockRemainingSeconds: currentMove.clockSeconds,
      tacticTag: currentMove.tacticTag || 'general',
      tacticSummary: currentMove.tacticSummary || 'Error táctico',
    });

    setGeminiAdvice(advice);
    setGeminiLoading(false);
  };

  // Add to Dojo
  const handleAddToDojo = () => {
    if (!currentMove) return;
    addBlunderToDojo({
      fen: currentMove.fenBefore,
      turn: currentMove.color,
      userColor: game.userColor === 'white' ? 'w' : 'b',
      userMoveSan: currentMove.san,
      bestMoveSan: currentMove.bestMoveSan || '',
      bestMoveUci: currentMove.bestMoveUci || '',
      explanation: geminiAdvice || currentMove.tacticSummary || 'Error táctico',
      tacticTag: currentMove.tacticTag || 'general',
      tacticSummary: currentMove.tacticSummary || 'Error táctico',
      sourceGameUrl: game.url,
      timeControl: game.time_control,
    });
    setDojoAdded(true);
    soundService.playSuccess();
  };

  // Filter blunders of the user
  const userTurn = game.userColor === 'white' ? 'w' : 'b';
  const userBlunders = moves.filter(
    (m) => m.color === userTurn && (m.classification === 'blunder' || m.classification === 'mistake')
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#18202c] border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-[#0f141c] hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">
                {game.white.username} ({game.white.rating}) vs. {game.black.username} ({game.black.rating})
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                {game.time_class}
              </span>
            </div>
            <p className="text-xs text-slate-400">{extractOpeningName(game.eco || '')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOrientation(orientation === 'white' ? 'black' : 'white')}
            className="px-3 py-1.5 bg-[#0f141c] hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Girar Tablero</span>
          </button>

          <button
            onClick={onGoToDojo}
            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-bold rounded-xl border border-emerald-500/30 transition flex items-center gap-1.5"
          >
            <Brain size={14} />
            <span>Ir al Dojo</span>
          </button>
        </div>
      </div>

      {/* Blunder Quick Timeline */}
      {userBlunders.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-900/40 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mr-2">
            <AlertTriangle size={15} />
            <span>Tus Errores Críticos ({userBlunders.length}):</span>
          </div>
          {userBlunders.map((b) => (
            <button
              key={b.ply}
              onClick={() => goToPly(b.ply)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition ${
                currentPly === b.ply
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-950'
                  : 'bg-rose-900/40 hover:bg-rose-800/60 text-rose-200 border border-rose-700/50'
              }`}
            >
              Jugada {b.moveNumber}. {b.san} {b.classification === 'blunder' ? '??' : '?'}
            </button>
          ))}
        </div>
      )}

      {/* Main Board + Analysis Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chessboard Column */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-[#222c3c] bg-[#121824]">
            <Chessboard
              options={{
                position: currentFen,
                boardOrientation: orientation,
                allowDragging: false,
                darkSquareStyle: { backgroundColor: '#648a56' },
                lightSquareStyle: { backgroundColor: '#ece9d8' },
                boardStyle: { borderRadius: '12px' },
              }}
            />
          </div>

          {/* Playback Controls */}
          <div className="w-full max-w-[500px] flex items-center justify-between mt-3 bg-[#18202c] border border-slate-800 rounded-xl p-2 shadow-md">
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPly(0)}
                disabled={currentPly === 0}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 transition"
                title="Inicio"
              >
                <ChevronsLeft size={18} />
              </button>
              <button
                onClick={() => goToPly(currentPly - 1)}
                disabled={currentPly === 0}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 transition"
                title="Jugada anterior"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className="text-xs font-mono font-bold text-slate-300">
              Jugada {currentPly} / {moves.length}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPly(currentPly + 1)}
                disabled={currentPly === moves.length}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 transition"
                title="Siguiente jugada"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => goToPly(moves.length)}
                disabled={currentPly === moves.length}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 transition"
                title="Final"
              >
                <ChevronsRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Tactical Diagnosis & Gemini Grandmaster Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Current Move Card */}
          {currentMove ? (
            <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white font-mono">
                    {currentMove.moveNumber}. {currentMove.san}
                  </span>
                  {currentMove.classification && (
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        currentMove.classification === 'blunder'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : currentMove.classification === 'mistake'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {currentMove.classification === 'blunder'
                        ? 'Error Grave (??)'
                        : currentMove.classification === 'mistake'
                        ? 'Imprecisión (?)'
                        : 'Buena Jugada'}
                    </span>
                  )}
                </div>

                {currentMove.timeSpentSeconds !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                    <Clock size={13} className="text-amber-400" />
                    <span>{currentMove.timeSpentSeconds}s</span>
                  </div>
                )}
              </div>

              {/* Algorithmic Diagnostic Summary */}
              {currentMove.tacticSummary && (
                <div className="p-3.5 bg-[#0f141c] rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    Diagnóstico Táctico Heurístico:
                  </p>
                  <p className="leading-relaxed">{currentMove.tacticSummary}</p>
                </div>
              )}

              {/* Better Engine Move */}
              {currentMove.bestMoveSan && currentMove.classification === 'blunder' && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-emerald-400">Recomendación de Stockfish:</p>
                  <p className="text-emerald-200">
                    En vez de <span className="font-mono font-bold text-rose-300">{currentMove.san}</span>, la jugada superior era{' '}
                    <span className="font-mono font-black text-emerald-300 px-1.5 py-0.5 bg-emerald-900/60 rounded">
                      {currentMove.bestMoveSan}
                    </span>
                  </p>
                </div>
              )}

              {/* Gemini Grandmaster Coach Section */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles size={15} />
                    Gemini Grandmaster Coach
                  </span>

                  <button
                    onClick={handleAskGemini}
                    disabled={geminiLoading}
                    className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-50 flex items-center gap-1 shadow-md shadow-emerald-950"
                  >
                    <Sparkles size={12} />
                    <span>{geminiLoading ? 'Analizando...' : 'Explicar con IA'}</span>
                  </button>
                </div>

                {geminiAdvice ? (
                  <div className="p-3.5 bg-gradient-to-br from-[#121c27] to-[#0f141c] border border-emerald-500/30 rounded-xl text-xs text-slate-200 leading-relaxed space-y-2">
                    <div className="whitespace-pre-line">{geminiAdvice}</div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Haz clic en "Explicar con IA" para que Google Gemini traduzca los números en un consejo psicológico y estratégico claro.
                  </p>
                )}
              </div>

              {/* Add to Dojo Button */}
              {currentMove.color === userTurn && (
                <div className="pt-2">
                  <button
                    onClick={handleAddToDojo}
                    disabled={dojoAdded}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                      dojoAdded
                        ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                    }`}
                  >
                    {dojoAdded ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>¡Guardado en tu Dojo de Repaso!</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={16} />
                        <span>Guardar en mi Dojo (Repaso Espaciado)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs space-y-2">
              <p className="font-bold text-slate-300">Posición Inicial</p>
              <p>Avanza en la partida usando los controles o haz clic en cualquier jugada para examinarla.</p>
            </div>
          )}

          {/* Move Notation List */}
          <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-4 max-h-56 overflow-y-auto space-y-1">
            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Historial de Jugadas</h3>
            <div className="grid grid-cols-2 gap-1 text-xs font-mono">
              {moves.map((m) => (
                <button
                  key={m.ply}
                  onClick={() => goToPly(m.ply)}
                  className={`px-2 py-1 rounded text-left transition flex items-center justify-between ${
                    currentPly === m.ply
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>
                    {m.color === 'w' ? `${m.moveNumber}. ` : '... '}
                    {m.san}
                  </span>
                  {m.classification === 'blunder' && <span className="text-rose-400 font-bold">??</span>}
                  {m.classification === 'mistake' && <span className="text-amber-400 font-bold">?</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
