import React, { useState, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import type { ChessComGame } from '../types/chess';
import { analyzeRepertoire } from '../services/repertoireAnalyzer';

interface RepertoireViewProps {
  games: ChessComGame[];
}

export const RepertoireView: React.FC<RepertoireViewProps> = ({ games }) => {
  const [activeSide, setActiveSide] = useState<'white' | 'black'>('white');

  const { whiteOpenings, blackOpenings } = useMemo(() => {
    return analyzeRepertoire(games);
  }, [games]);

  const activeList = activeSide === 'white' ? whiteOpenings : blackOpenings;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <BookOpen size={16} />
            <span>Laboratorio de Aperturas & Repertorio</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">
            Efectividad por Variante de Apertura
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Descubre con qué sistemas obtienes tus mejores victorias y en qué defensas tienes mayores fugas de Elo.
          </p>
        </div>

        {/* Color Switcher */}
        <div className="flex items-center bg-[#0f141c] p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveSide('white')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeSide === 'white'
                ? 'bg-slate-200 text-slate-900 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400" />
            <span>Con Blancas ({whiteOpenings.length})</span>
          </button>

          <button
            onClick={() => setActiveSide('black')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeSide === 'black'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-600" />
            <span>Con Negras ({blackOpenings.length})</span>
          </button>
        </div>
      </div>

      {/* Opening List / Cards */}
      {activeList.length === 0 ? (
        <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
          No hay partidas registradas aún con este color.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.map((item, index) => {
            const isHighWinRate = item.winRate >= 50;

            return (
              <div
                key={item.eco + index}
                className="bg-[#18202c] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                      Apertura #{index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-white capitalize leading-tight">
                      {item.name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-lg font-black font-mono ${
                        isHighWinRate ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.winRate}%
                    </span>
                    <p className="text-[10px] text-slate-400">Tasa de Victoria</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#0f141c] rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHighWinRate
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-rose-500 to-amber-500'
                    }`}
                    style={{ width: `${item.winRate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-mono">
                  <span>Total: {item.totalGames} partidas</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{item.wins}V</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-rose-400 font-bold">{item.losses}D</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-amber-400 font-bold">{item.draws}T</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
