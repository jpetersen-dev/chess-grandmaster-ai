import React, { useState } from 'react';
import { Play, Flame, Zap, Shield, Trophy, XCircle, Search, Sparkles, Filter, ChevronRight, Swords } from 'lucide-react';
import type { ChessComGame, ChessComProfile } from '../types/chess';
import { extractOpeningName } from '../services/repertoireAnalyzer';

interface DashboardViewProps {
  profile: ChessComProfile | null;
  games: ChessComGame[];
  isLoading: boolean;
  onSelectGame: (game: ChessComGame) => void;
  onQuickTrain: () => void;
  duePuzzlesCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  games,
  isLoading,
  onSelectGame,
  onQuickTrain,
  duePuzzlesCount,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'bullet' | 'blitz' | 'rapid' | 'won' | 'lost'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = games.filter((g) => {
    if (filterType === 'bullet' && g.time_class !== 'bullet') return false;
    if (filterType === 'blitz' && g.time_class !== 'blitz') return false;
    if (filterType === 'rapid' && g.time_class !== 'rapid') return false;
    if (filterType === 'won' && !g.userWon) return false;
    if (filterType === 'lost' && g.userWon) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const opp = g.userColor === 'white' ? g.black.username.toLowerCase() : g.white.username.toLowerCase();
      const opening = extractOpeningName(g.eco || '').toLowerCase();
      return opp.includes(q) || opening.includes(q);
    }
    return true;
  });

  const totalWins = games.filter((g) => g.userWon).length;
  const winRate = games.length > 0 ? Math.round((totalWins / games.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#16202e] to-[#0f141c] border border-emerald-900/30 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles size={14} />
              <span>Base de Datos Sincronizada con Chess.com</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Bienvenido, Maestro <span className="text-emerald-400">{profile?.username || 'jpeza'}</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Hemos indexado tus partidas reales para extraer tus patrones de error, apuros de reloj y desviaciones teóricas con Stockfish y Google Gemini.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onQuickTrain}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition transform active:scale-95"
            >
              <Swords size={18} />
              <span>Entrenar Mis Errores ({duePuzzlesCount})</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-8 -bottom-12 text-[140px] text-white/[0.02] pointer-events-none select-none font-black font-mono">
          ♞
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#18202c] border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Zap size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Elo Bullet</p>
            <p className="text-xl font-extrabold text-white">{profile?.bullet?.rating || '---'}</p>
          </div>
        </div>

        <div className="bg-[#18202c] border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
            <Flame size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Elo Blitz</p>
            <p className="text-xl font-extrabold text-white">{profile?.blitz?.rating || '---'}</p>
          </div>
        </div>

        <div className="bg-[#18202c] border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Shield size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Elo Rápido</p>
            <p className="text-xl font-extrabold text-white">{profile?.rapid?.rating || '---'}</p>
          </div>
        </div>

        <div className="bg-[#18202c] border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Trophy size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Efectividad Reciente</p>
            <p className="text-xl font-extrabold text-white">{winRate}% <span className="text-xs text-slate-400 font-normal">({totalWins}V/{games.length}P)</span></p>
          </div>
        </div>
      </div>

      {/* Games List & Filters */}
      <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <h2 className="text-base font-bold text-white">Partidas Recientes ({games.length})</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar rival o apertura..."
                className="w-full bg-[#0f141c] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          {(['all', 'bullet', 'blitz', 'rapid', 'won', 'lost'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterType(mode)}
              className={`px-3 py-1.5 rounded-lg capitalize transition shrink-0 ${
                filterType === mode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#0f141c] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {mode === 'all' ? 'Todas' : mode === 'won' ? 'Ganadas' : mode === 'lost' ? 'Perdidas' : mode}
            </button>
          ))}
        </div>

        {/* Games Table/Cards */}
        {isLoading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Descargando partidas desde Chess.com...</p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            No se encontraron partidas con los filtros seleccionados.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredGames.slice(0, 30).map((game, i) => {
              const openingName = extractOpeningName(game.eco || '');
              const opponent = game.userColor === 'white' ? game.black : game.white;
              const userRes = game.userColor === 'white' ? game.white.result : game.black.result;

              return (
                <div
                  key={game.url || i}
                  onClick={() => onSelectGame(game)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#121824] hover:bg-[#1f2937] border border-slate-800/80 hover:border-slate-700 rounded-xl cursor-pointer transition shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Result Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                        game.userWon
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : userRes === 'repetition' || userRes === 'stalemate'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {game.userWon ? <Trophy size={18} /> : <XCircle size={18} />}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          vs. {opponent.username} ({opponent.rating})
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                            game.time_class === 'bullet'
                              ? 'bg-amber-500/10 text-amber-400'
                              : game.time_class === 'blitz'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-cyan-500/10 text-cyan-400'
                          }`}
                        >
                          {game.time_class} {game.time_control}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          ({game.userColor === 'white' ? 'Blancas' : 'Negras'})
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate font-medium">
                        {openingName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        game.userWon
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : 'text-rose-400 bg-rose-950/40'
                      }`}
                    >
                      {game.userWon ? 'Victoria' : 'Derrota'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGame(game);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 group-hover:bg-emerald-600 text-emerald-400 group-hover:text-white rounded-lg text-xs font-bold transition border border-emerald-500/30 group-hover:border-transparent"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Analizar</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
