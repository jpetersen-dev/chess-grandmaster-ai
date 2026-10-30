import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  Brain,
  CheckCircle,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Flame,
  Calendar,
  Layers,
  Trash2,
} from 'lucide-react';
import type { SRSPuzzle, ChessComGame } from '../types/chess';
import {
  getStoredPuzzles,
  recordPuzzleReview,
  deletePuzzle,
  addBlunderToDojo,
} from '../services/srsStorage';
import { parsePgnMoves } from '../services/chesscom';
import { diagnoseMoveTactics, evaluatePositionRough } from '../services/tacticsClassifier';
import { analyzePosition } from '../services/stockfish';
import { soundService } from '../services/soundService';

interface DojoViewProps {
  games: ChessComGame[];
}

export const DojoView: React.FC<DojoViewProps> = ({ games }) => {
  const [puzzles, setPuzzles] = useState<SRSPuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [boardPosition, setBoardPosition] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [hintVisible, setHintVisible] = useState<boolean>(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);

  // Load puzzles on mount
  useEffect(() => {
    const list = getStoredPuzzles();
    setPuzzles(list);
    setCurrentIndex(0);
    if (list.length > 0) {
      setBoardPosition(list[0].fen);
      setStatus('idle');
      setHintVisible(false);
    }
  }, []);

  const currentPuzzle = puzzles[currentIndex];

  // Auto-generate puzzles from user games if dojo is empty
  const handleAutoGeneratePuzzles = async () => {
    if (games.length === 0) return;
    setIsAutoGenerating(true);

    let addedCount = 0;
    for (const game of games.slice(0, 15)) {
      if (addedCount >= 8) break;
      const parsed = parsePgnMoves(game.pgn);
      const userTurn = game.userColor === 'white' ? 'w' : 'b';

      for (const m of parsed) {
        if (m.color !== userTurn) continue;
        const roughBefore = evaluatePositionRough(m.fenBefore);
        const roughAfter = evaluatePositionRough(m.fenAfter);
        const evalBeforeSide = m.color === 'w' ? roughBefore : -roughBefore;
        const evalAfterSide = m.color === 'w' ? roughAfter : -roughAfter;
        const drop = Math.max(0, evalBeforeSide - evalAfterSide);

        if (drop >= 200) {
          const diag = diagnoseMoveTactics(m, true, drop);
          try {
            const engineResult = await analyzePosition(m.fenBefore);
            const bestSan = engineResult.bestMoveSan || engineResult.bestMoveUci;
            if (bestSan && bestSan !== m.san) {
              addBlunderToDojo({
                fen: m.fenBefore,
                turn: m.color,
                userColor: userTurn,
                userMoveSan: m.san,
                bestMoveSan: bestSan,
                bestMoveUci: engineResult.bestMoveUci,
                explanation: diag.summary,
                tacticTag: diag.tacticTag,
                tacticSummary: diag.summary,
                sourceGameUrl: game.url,
                timeControl: game.time_control,
              });
              addedCount++;
              if (addedCount >= 8) break;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    const updated = getStoredPuzzles();
    setPuzzles(updated);
    if (updated.length > 0) {
      setBoardPosition(updated[0].fen);
      setCurrentIndex(0);
    }
    setIsAutoGenerating(false);
    soundService.playSuccess();
  };

  // Handle piece drop on chessboard
  const onPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!currentPuzzle || status === 'success') return false;

    const chess = new Chess(boardPosition);
    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      // Check if move matches bestMoveSan or UCI
      const playedUci = `${sourceSquare}${targetSquare}`;
      const isCorrect =
        move.san === currentPuzzle.bestMoveSan ||
        playedUci === currentPuzzle.bestMoveUci ||
        move.san.replace('+', '').replace('#', '') === currentPuzzle.bestMoveSan.replace('+', '').replace('#', '');

      if (isCorrect) {
        setBoardPosition(chess.fen());
        setStatus('success');
        soundService.playSuccess();
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
        recordPuzzleReview(currentPuzzle.id, true);
        return true;
      } else {
        setStatus('failed');
        soundService.playError();
        recordPuzzleReview(currentPuzzle.id, false);
        return false;
      }
    } catch {
      return false;
    }
  };

  const handleNextPuzzle = () => {
    const nextIdx = (currentIndex + 1) % puzzles.length;
    setCurrentIndex(nextIdx);
    setBoardPosition(puzzles[nextIdx].fen);
    setStatus('idle');
    setHintVisible(false);
  };

  const handleResetPuzzle = () => {
    if (currentPuzzle) {
      setBoardPosition(currentPuzzle.fen);
      setStatus('idle');
    }
  };

  const handleDeleteCurrent = () => {
    if (!currentPuzzle) return;
    deletePuzzle(currentPuzzle.id);
    const updated = getStoredPuzzles();
    setPuzzles(updated);
    if (updated.length > 0) {
      const nextIdx = Math.min(currentIndex, updated.length - 1);
      setCurrentIndex(nextIdx);
      setBoardPosition(updated[nextIdx].fen);
      setStatus('idle');
    }
  };

  if (puzzles.length === 0) {
    return (
      <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-10 text-center max-w-xl mx-auto space-y-4 my-8 animate-in fade-in">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
          <Brain size={32} />
        </div>
        <h2 className="text-xl font-bold text-white">Tu Dojo de Errores está vacío</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Puedes agregar posiciones donde cometiste errores desde el <strong>Analizador de Partidas</strong>, o podemos escanear tus partidas de Chess.com para extraer automáticamente tus fallos tácticos más repetidos.
        </p>

        <button
          onClick={handleAutoGeneratePuzzles}
          disabled={isAutoGenerating || games.length === 0}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950 transition flex items-center gap-2 mx-auto disabled:opacity-50"
        >
          <Sparkles size={16} />
          <span>{isAutoGenerating ? 'Extrayendo tus blunders...' : 'Generar Puzzles desde mis Partidas'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Dojo Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#18202c] border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Brain size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              Dojo de Repaso Espaciado (SRS)
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                {currentIndex + 1} / {puzzles.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Posiciones reales donde cometiste un error en Chess.com. Encuentra la jugada ganadora.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteCurrent}
            title="Eliminar este ejercicio"
            className="p-2 text-slate-500 hover:text-rose-400 bg-[#0f141c] rounded-xl border border-slate-800 transition"
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={handleResetPuzzle}
            className="p-2 text-slate-300 hover:text-white bg-[#0f141c] rounded-xl border border-slate-800 transition flex items-center gap-1 text-xs font-semibold"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>

          <button
            onClick={handleNextPuzzle}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950"
          >
            <span>Siguiente</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Flashcard Exercise Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Board */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[480px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-[#222c3c] bg-[#121824]">
            <Chessboard
              options={{
                position: boardPosition,
                boardOrientation: currentPuzzle.userColor === 'w' ? 'white' : 'black',
                onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? onPieceDrop(sourceSquare, targetSquare) : false,
                darkSquareStyle: { backgroundColor: '#648a56' },
                lightSquareStyle: { backgroundColor: '#ece9d8' },
                boardStyle: { borderRadius: '12px' },
              }}
            />
          </div>

          <p className="text-xs text-slate-400 mt-3 font-medium">
            Juegan las {currentPuzzle.userColor === 'w' ? 'Blancas' : 'Negras'}. Arrastra la mejor pieza.
          </p>
        </div>

        {/* Feedback & Coaching Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Challenge Box */}
          <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Flame size={14} />
                Tu Error en la Partida
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Repaso cada: {currentPuzzle.interval}d
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              En esta partida jugaste la errónea{' '}
              <span className="font-mono font-bold text-rose-400 px-1.5 py-0.5 bg-rose-950/60 rounded">
                {currentPuzzle.userMoveSan}
              </span>
              . ¿Qué debiste jugar en su lugar?
            </p>

            {/* Status Feedback */}
            {status === 'success' && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl space-y-2 animate-in zoom-in-95">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle size={18} />
                  <span>¡Excelente! Jugada Correcta: {currentPuzzle.bestMoveSan}</span>
                </div>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  {currentPuzzle.explanation}
                </p>
              </div>
            )}

            {status === 'failed' && (
              <div className="p-4 bg-rose-950/60 border border-rose-500/50 rounded-xl space-y-2 animate-in zoom-in-95">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <XCircle size={18} />
                  <span>No es la jugada óptima. ¡Inténtalo de nuevo!</span>
                </div>
                <p className="text-xs text-rose-200">
                  Verifica qué pieza del oponente está vulnerable o qué amenaza directa existe.
                </p>
              </div>
            )}

            {/* Hint Button */}
            {!hintVisible && status !== 'success' && (
              <button
                onClick={() => setHintVisible(true)}
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition font-medium"
              >
                <HelpCircle size={14} />
                <span>Mostrar Pista Táctica</span>
              </button>
            )}

            {hintVisible && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200 space-y-1">
                <p className="font-bold">Pista del Entrenador:</p>
                <p>{currentPuzzle.tacticSummary}</p>
                {status !== 'success' && (
                  <p className="text-amber-400/80 italic font-mono text-[11px]">
                    Solución: {currentPuzzle.bestMoveSan}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Spaced Repetition Stats */}
          <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-emerald-400" />
              <span>Intervalo de memoria: {currentPuzzle.interval} días</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-cyan-400" />
              <span>Aciertos: {currentPuzzle.repetitions}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
