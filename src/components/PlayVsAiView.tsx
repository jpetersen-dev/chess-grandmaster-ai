import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Bot, RotateCcw, Sparkles, Undo2, Swords } from 'lucide-react';
import { analyzePosition } from '../services/stockfish';
import { soundService } from '../services/soundService';

interface PlayVsAiViewProps {
  initialFen?: string;
}

export const PlayVsAiView: React.FC<PlayVsAiViewProps> = ({ initialFen }) => {
  const [game, setGame] = useState<Chess>(new Chess(initialFen || undefined));
  const [fen, setFen] = useState<string>(initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [playerColor] = useState<'white' | 'black'>('white');
  const [difficulty, setDifficulty] = useState<number>(800);
  const [hint, setHint] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<string>('');

  const isPlayerTurn = (game.turn() === 'w' && playerColor === 'white') || (game.turn() === 'b' && playerColor === 'black');

  // AI response move
  useEffect(() => {
    if (!isPlayerTurn && !game.isGameOver()) {
      setIsAiThinking(true);
      const timer = setTimeout(async () => {
        try {
          const depth = difficulty <= 800 ? 2 : difficulty <= 1200 ? 5 : 10;
          const result = await analyzePosition(game.fen(), depth);

          const moves = game.moves({ verbose: true });
          if (moves.length === 0) return;

          // Occasionally make a slight mistake on lower Elos
          let chosenMove = moves[0];
          if (difficulty <= 800 && Math.random() < 0.4) {
            chosenMove = moves[Math.floor(Math.random() * moves.length)];
          } else if (result.bestMoveUci) {
            const match = moves.find(
              (m) => `${m.from}${m.to}${m.promotion || ''}` === result.bestMoveUci
            );
            if (match) chosenMove = match;
          }

          game.move(chosenMove);
          setFen(game.fen());
          if (chosenMove.captured) {
            soundService.playCapture();
          } else if (game.inCheck()) {
            soundService.playCheck();
          } else {
            soundService.playMove();
          }

          if (game.isGameOver()) {
            if (game.isCheckmate()) {
              setGameStatus('¡Jaque mate! La IA ha ganado.');
              soundService.playError();
            } else {
              setGameStatus('Tablas.');
            }
          }
        } catch {
          // ignore
        } finally {
          setIsAiThinking(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [fen, isPlayerTurn, game, difficulty]);

  const onPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!isPlayerTurn || game.isGameOver()) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      setFen(game.fen());
      setHint('');

      if (move.captured) {
        soundService.playCapture();
      } else if (game.inCheck()) {
        soundService.playCheck();
      } else {
        soundService.playMove();
      }

      if (game.isGameOver()) {
        if (game.isCheckmate()) {
          setGameStatus('¡Felicidades! ¡Has ganado por Jaque Mate!');
          soundService.playSuccess();
        } else {
          setGameStatus('Partida finalizada en tablas.');
        }
      }

      return true;
    } catch {
      return false;
    }
  };

  const handleResetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setHint('');
    setGameStatus('');
  };

  const handleUndo = () => {
    game.undo(); // Undo AI move
    game.undo(); // Undo user move
    setFen(game.fen());
    setHint('');
    setGameStatus('');
  };

  const handleGetHint = async () => {
    const evalRes = await analyzePosition(game.fen(), 8);
    if (evalRes.bestMoveSan) {
      setHint(`Pista de Gran Maestro: Considera la jugada ${evalRes.bestMoveSan}.`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              Sparring con IA Adaptativa
              {isAiThinking && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse font-mono">
                  Calculando jugada...
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Practica partidas libres o posiciones de entrenamiento con nivel ajustable.
            </p>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Nivel Elo:</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="bg-[#0f141c] border border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value={500}>Principiante (500 Elo)</option>
            <option value={800}>Casual (800 Elo)</option>
            <option value={1000}>Intermedio (1000 Elo)</option>
            <option value={1200}>Club (1200 Elo)</option>
            <option value={1500}>Avanzado (1500 Elo)</option>
          </select>
        </div>
      </div>

      {/* Main Board & Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Board */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[480px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-[#222c3c] bg-[#121824]">
            <Chessboard
              options={{
                position: fen,
                boardOrientation: playerColor,
                onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? onPieceDrop(sourceSquare, targetSquare) : false,
                darkSquareStyle: { backgroundColor: '#648a56' },
                lightSquareStyle: { backgroundColor: '#ece9d8' },
                boardStyle: { borderRadius: '12px' },
              }}
            />
          </div>

          <div className="w-full max-w-[480px] flex items-center justify-between mt-3 bg-[#18202c] border border-slate-800 rounded-xl p-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                className="px-3 py-1.5 bg-[#0f141c] hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
              >
                <Undo2 size={14} />
                <span>Deshacer</span>
              </button>

              <button
                onClick={handleResetGame}
                className="px-3 py-1.5 bg-[#0f141c] hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Reiniciar</span>
              </button>
            </div>

            <button
              onClick={handleGetHint}
              className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white text-xs font-bold rounded-lg border border-cyan-500/30 transition flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Pedir Pista</span>
            </button>
          </div>
        </div>

        {/* Game State Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Swords size={16} className="text-emerald-400" />
              Estado de la Partida
            </h3>

            {gameStatus ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm font-bold text-center">
                {gameStatus}
              </div>
            ) : (
              <p className="text-xs text-slate-300">
                Turno de:{' '}
                <strong className="text-white capitalize">
                  {game.turn() === 'w' ? 'Blancas' : 'Negras'}
                </strong>{' '}
                {isPlayerTurn ? '(Tu Turno)' : '(IA pensando...)'}
              </p>
            )}

            {hint && (
              <div className="p-3 bg-cyan-950/40 border border-cyan-800/50 rounded-xl text-xs text-cyan-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  Consejo de Stockfish:
                </p>
                <p>{hint}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
