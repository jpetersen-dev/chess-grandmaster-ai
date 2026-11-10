import React, { useState, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import {
  AlertTriangle,
  ChevronRight,
  XCircle,
  Sparkles,
  Swords,
  ArrowRight,
  RotateCcw,
  Compass,
} from 'lucide-react';
import type { ChessComGame } from '../types/chess';
import {
  buildRepertoirePillars,
} from '../services/repertoireTree';
import type {
  MoveTreeNode,
  CriticalLeak,
  RepertoirePillarData,
} from '../services/repertoireTree';
import { explainBlunderWithGemini } from '../services/geminiCoach';

interface RepertoireExplorerViewProps {
  games: ChessComGame[];
  onInspectGame: (game: ChessComGame) => void;
  onLaunchSparringLine: (fen: string, playerColor: 'white' | 'black', lineName: string) => void;
}

export const RepertoireExplorerView: React.FC<RepertoireExplorerViewProps> = ({
  games,
  onInspectGame,
  onLaunchSparringLine,
}) => {
  const [activePillarId, setActivePillarId] = useState<'white_d4' | 'black_sicilian' | 'black_vs_d4'>('white_d4');
  const [selectedNode, setSelectedNode] = useState<MoveTreeNode | null>(null);
  const [nodeHistory, setNodeHistory] = useState<MoveTreeNode[]>([]);
  const [geminiAdvice, setGeminiAdvice] = useState<string>('');
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [selectedLeak, setSelectedLeak] = useState<CriticalLeak | null>(null);

  // Build the 3 pillars with deep tree up to move 6
  const pillars = useMemo(() => {
    return buildRepertoirePillars(games);
  }, [games]);

  const currentPillar: RepertoirePillarData = pillars[
    activePillarId === 'white_d4' ? 'whiteD4' : activePillarId === 'black_sicilian' ? 'blackSicilian' : 'blackVsD4'
  ];

  // Active root node for display
  const activeRoot = selectedNode || currentPillar.tree;

  const handleSelectPillar = (id: 'white_d4' | 'black_sicilian' | 'black_vs_d4') => {
    setActivePillarId(id);
    setSelectedNode(null);
    setNodeHistory([]);
    setGeminiAdvice('');
    setSelectedLeak(null);
  };

  const handleDrillDownNode = (childNode: MoveTreeNode) => {
    setNodeHistory([...nodeHistory, activeRoot]);
    setSelectedNode(childNode);
    setGeminiAdvice('');
  };

  const handleGoBackInTree = () => {
    if (nodeHistory.length === 0) {
      setSelectedNode(null);
      return;
    }
    const prev = nodeHistory[nodeHistory.length - 1];
    setNodeHistory(nodeHistory.slice(0, -1));
    setSelectedNode(prev);
    setGeminiAdvice('');
  };

  const handleResetToTreeRoot = () => {
    setSelectedNode(null);
    setNodeHistory([]);
    setGeminiAdvice('');
  };

  const handleAskGeminiStrategy = async (node: MoveTreeNode) => {
    setGeminiLoading(true);
    setGeminiAdvice('');

    const context = {
      playerColor: currentPillar.perspectiveColor === 'white' ? ('Blanco' as const) : ('Negro' as const),
      fen: node.fen,
      userMoveSan: node.san || 'Posición actual',
      bestMoveSan: node.children[0]?.san || 'Continuación recomendada',
      evalDropCentipawns: node.lossRate >= 50 ? 250 : 100,
      tacticTag: 'repertoire_leak',
      tacticSummary: `Línea de repertorio con ${node.losses} derrotas de ${node.totalGames} partidas (${node.winRate}% de victorias).`,
    };

    const advice = await explainBlunderWithGemini(context);
    setGeminiAdvice(advice);
    setGeminiLoading(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Pillar Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => handleSelectPillar('white_d4')}
          className={`p-4 rounded-2xl border text-left transition relative overflow-hidden ${
            activePillarId === 'white_d4'
              ? 'bg-[#1e293b] border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500'
              : 'bg-[#18202c] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400" />
              Blancas con 1. d4
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {pillars.whiteD4.totalGames} partidas
            </span>
          </div>
          <h3 className="text-sm font-extrabold text-white">Sistema 1. d4 & Anti-Gambito</h3>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Top 3 respuestas (d5, e5 Englund, Nf6 Indias) y sub-variantes a jugada 6.
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-bold font-mono">{pillars.whiteD4.winRate}% Vic.</span>
            <span className="text-slate-500">|</span>
            <span className="text-rose-400 font-bold font-mono">{pillars.whiteD4.losses} Derrotas</span>
          </div>
        </button>

        <button
          onClick={() => handleSelectPillar('black_sicilian')}
          className={`p-4 rounded-2xl border text-left transition relative overflow-hidden ${
            activePillarId === 'black_sicilian'
              ? 'bg-[#1e293b] border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500'
              : 'bg-[#18202c] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-600" />
              Negras vs 1. e4
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {pillars.blackSicilian.totalGames} partidas
            </span>
          </div>
          <h3 className="text-sm font-extrabold text-white">Defensa Siciliana (1... c5)</h3>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Respuestas a 2. Nf3, 2. Nc3 Cerrada, 2. c3 Alapin y cómo respondes.
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="text-cyan-400 font-bold font-mono">{pillars.blackSicilian.winRate}% Vic.</span>
            <span className="text-slate-500">|</span>
            <span className="text-rose-400 font-bold font-mono">{pillars.blackSicilian.losses} Derrotas</span>
          </div>
        </button>

        <button
          onClick={() => handleSelectPillar('black_vs_d4')}
          className={`p-4 rounded-2xl border text-left transition relative overflow-hidden ${
            activePillarId === 'black_vs_d4'
              ? 'bg-[#1e293b] border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500'
              : 'bg-[#18202c] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-600" />
              Negras vs 1. d4
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {pillars.blackVsD4.totalGames} partidas
            </span>
          </div>
          <h3 className="text-sm font-extrabold text-white">Setup Flanco Rey (d6/d5/KID)</h3>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Buscando enroque rápido y estructura tipo India de Rey segura.
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="text-amber-400 font-bold font-mono">{pillars.blackVsD4.winRate}% Vic.</span>
            <span className="text-slate-500">|</span>
            <span className="text-rose-400 font-bold font-mono">{pillars.blackVsD4.losses} Derrotas</span>
          </div>
        </button>
      </div>

      {/* Critical Leaks Radar Banner */}
      {currentPillar.criticalLeaks.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/40 via-[#1e1520] to-[#18202c] border border-rose-900/40 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
              <AlertTriangle size={18} className="animate-pulse" />
              <span>Zonas de Mayor Fuga Detectadas en tus Partidas</span>
            </div>
            <span className="text-xs text-rose-300/80 font-mono">
              {currentPillar.criticalLeaks.length} líneas críticas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentPillar.criticalLeaks.map((leak) => (
              <div
                key={leak.id}
                onClick={() => setSelectedLeak(leak)}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedLeak?.id === leak.id
                    ? 'bg-rose-900/40 border-rose-500 shadow-md'
                    : 'bg-[#121824]/90 border-slate-800 hover:border-rose-700/60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-300 font-mono">
                      {leak.lineSan.slice(0, 4).join(' ')}
                    </span>
                    <span className="text-xs font-mono font-black text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
                      {leak.winRate}% Vic ({leak.losses} ❌)
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{leak.title}</h4>
                  <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                    {leak.description}
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Total: {leak.totalGames} juegos</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchSparringLine(leak.fen, currentPillar.perspectiveColor, leak.title);
                    }}
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    <Swords size={12} />
                    <span>Adiestrarme</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Interactive Tree & Board Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Chessboard & Navigation Breadcrumb */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[440px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-[#222c3c] bg-[#121824]">
            <Chessboard
              options={{
                position: activeRoot.fen,
                boardOrientation: currentPillar.perspectiveColor,
                allowDragging: false,
                darkSquareStyle: { backgroundColor: '#648a56' },
                lightSquareStyle: { backgroundColor: '#ece9d8' },
                boardStyle: { borderRadius: '12px' },
              }}
            />
          </div>

          {/* Breadcrumb & Navigation */}
          <div className="w-full max-w-[440px] mt-3 bg-[#18202c] border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto text-slate-300 font-mono font-bold">
              <button
                onClick={handleResetToTreeRoot}
                className="hover:text-emerald-400 transition"
              >
                Raíz
              </button>
              {selectedNode && (
                <>
                  <ChevronRight size={13} className="text-slate-500" />
                  <span className="text-emerald-400">
                    Jugada {activeRoot.moveNumber}. {activeRoot.san}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {nodeHistory.length > 0 && (
                <button
                  onClick={handleGoBackInTree}
                  className="px-2 py-1 bg-[#0f141c] hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>Atrás</span>
                </button>
              )}
              <button
                onClick={() => onLaunchSparringLine(activeRoot.fen, currentPillar.perspectiveColor, activeRoot.name || 'Variante seleccionada')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 shadow-md shadow-emerald-950 transition"
              >
                <Swords size={12} />
                <span>Sparring</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Top 3 Variants Tree Down to Move 6 */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Compass size={17} className="text-emerald-400" />
                  <span>Explorador de Variantes Principales (Hasta Jugada 6)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mostrando las 3 respuestas más frecuentes con estadísticas de tu base de datos real.
                </p>
              </div>

              <span className="text-xs font-mono font-bold px-2 py-1 bg-[#0f141c] rounded-lg border border-slate-800 text-slate-300">
                Profundidad: Jugada {activeRoot.moveNumber} / 6
              </span>
            </div>

            {/* Current Position Snapshot */}
            <div className="p-3 bg-[#0f141c] rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-slate-400 text-[11px]">Posición Actual:</p>
                <p className="font-extrabold text-white font-mono text-sm">
                  {activeRoot.san ? `${activeRoot.moveNumber}. ${activeRoot.san}` : currentPillar.rootMoves.join(' ')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <div>
                    <span className="text-slate-400">Total: </span>
                    <span className="font-bold text-white">{activeRoot.totalGames}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-bold">{activeRoot.wins}V</span>
                    <span className="text-slate-500"> / </span>
                    <span className="text-rose-400 font-bold">{activeRoot.losses}D</span>
                  </div>
                  <div
                    className={`font-black px-2 py-0.5 rounded text-xs ${
                      activeRoot.winRate >= 52
                        ? 'bg-emerald-950 text-emerald-400'
                        : activeRoot.winRate >= 48
                        ? 'bg-amber-950 text-amber-400'
                        : 'bg-rose-950 text-rose-400'
                    }`}
                  >
                    {activeRoot.winRate}%
                  </div>
                </div>

                <button
                  onClick={() =>
                    onLaunchSparringLine(
                      activeRoot.fen,
                      currentPillar.perspectiveColor,
                      activeRoot.name || `Línea ${activeRoot.san || currentPillar.title}`
                    )
                  }
                  className="px-2.5 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-950/40 shrink-0"
                  title="Jugar revancha contra Stockfish 19 desde esta posición"
                >
                  <Swords size={12} />
                  <span>Revancha con IA</span>
                </button>
              </div>
            </div>

            {/* Top 3 Continuations */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {activeRoot.children.length > 0
                  ? `Las ${activeRoot.children.length} variantes principales del rival/siguientes:`
                  : 'Has alcanzado el límite de profundidad en esta rama.'}
              </p>

              {activeRoot.children.map((child, idx) => {
                const isHighLoss = child.lossRate >= 50;

                return (
                  <div
                    key={child.id}
                    onClick={() => handleDrillDownNode(child)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#121824] hover:bg-[#1f2937] border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                          isHighLoss
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        #{idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white font-mono">
                            {child.moveNumber}. {child.san}
                          </span>
                          {child.leakSeverity === 'critical' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              ⚠️ Fuga Crítica
                            </span>
                          )}
                        </div>
                        {child.name && (
                          <p className="text-xs text-slate-400 truncate font-medium">
                            {child.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right font-mono text-xs">
                        <span
                          className={`font-black ${
                            child.winRate >= 52
                              ? 'text-emerald-400'
                              : child.winRate >= 48
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {child.winRate}% Vic
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {child.losses} Derrotas / {child.totalGames} Juegos
                        </p>
                      </div>

                      <div className="p-1.5 bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-emerald-600 rounded-lg transition">
                        <ChevronRight size={15} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gemini Strategy Advisor */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Consejo Estratégico Gemini (Alineado a tu Estilo)
                </span>

                <button
                  onClick={() => handleAskGeminiStrategy(activeRoot)}
                  disabled={geminiLoading}
                  className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-50 flex items-center gap-1 shadow-md"
                >
                  <Sparkles size={12} />
                  <span>{geminiLoading ? 'Pensando...' : 'Diagnosticar con IA'}</span>
                </button>
              </div>

              {geminiAdvice ? (
                <div className="p-3 bg-gradient-to-br from-[#121c27] to-[#0f141c] border border-emerald-500/30 rounded-xl text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {geminiAdvice}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  Presiona "Diagnosticar con IA" para que Gemini te indique el plan para lograr tu enroque rápido y consolidar la posición sin caer en las trampas típicas del rival.
                </p>
              )}
            </div>

            {/* Lost Games in this line (Anatomía de Derrotas) */}
            {activeRoot.lossGames.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-rose-400 flex items-center gap-1.5">
                    <XCircle size={15} />
                    Tus Derrotas Reales en esta línea ({activeRoot.lossGames.length})
                  </span>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {activeRoot.lossGames.slice(0, 10).map((g, i) => {
                    const opponent = g.userColor === 'white' ? g.black : g.white;
                    return (
                      <div
                        key={g.url || i}
                        onClick={() => onInspectGame(g)}
                        className="flex items-center justify-between p-2.5 bg-[#0f141c] hover:bg-slate-800/80 rounded-xl border border-slate-800 text-xs cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-rose-400 font-bold font-mono">0-1</span>
                          <span className="text-slate-200 truncate">
                            vs. {opponent.username} ({opponent.rating})
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono uppercase">
                            {g.time_class}
                          </span>
                        </div>

                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 hover:underline shrink-0">
                          Examinar Falla <ArrowRight size={12} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
