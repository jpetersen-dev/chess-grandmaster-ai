import React from 'react';
import { LayoutDashboard, Crosshair, BrainCircuit, Settings, RefreshCw, Zap, Shield, Flame, GitFork, Swords } from 'lucide-react';
import type { ChessComProfile } from '../types/chess';

export type ActiveTab = 'repertoire' | 'dashboard' | 'inspector' | 'dojo' | 'sparring';

interface NavbarProps {
  profile: ChessComProfile | null;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  duePuzzlesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeTab,
  onTabChange,
  onOpenSettings,
  onRefresh,
  isRefreshing,
  duePuzzlesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#121824]/95 backdrop-blur-md border-b border-slate-800/80 px-4 pt-[max(env(safe-area-inset-top,0px),0.75rem)] pb-2.5 transition">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & User Profile */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/60 font-black text-slate-950 text-lg">
              ♞
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-wide">CHESS GRANDMASTER</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Radar de Fugas
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">1. d4 & Siciliana • Stockfish 17 • Gemini</p>
            </div>
          </div>

          {/* User profile snippet */}
          {profile && (
            <div className="flex items-center gap-2.5 bg-[#18202c] border border-slate-700/60 rounded-xl px-2.5 py-1.5">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                  {profile.username.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                  {profile.username}
                  <span className="text-[10px] text-emerald-400">●</span>
                </span>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  {profile.bullet && (
                    <span className="flex items-center gap-0.5" title="Bullet Elo">
                      <Zap size={10} className="text-amber-400" />
                      {profile.bullet.rating}
                    </span>
                  )}
                  {profile.blitz && (
                    <span className="flex items-center gap-0.5" title="Blitz Elo">
                      <Flame size={10} className="text-rose-400" />
                      {profile.blitz.rating}
                    </span>
                  )}
                  {profile.rapid && (
                    <span className="flex items-center gap-0.5" title="Rapid Elo">
                      <Shield size={10} className="text-cyan-400" />
                      {profile.rapid.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <nav className="flex items-center gap-1 bg-[#0f141c] p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            onClick={() => onTabChange('repertoire')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition shrink-0 ${
              activeTab === 'repertoire'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GitFork size={14} />
            <span>Árbol & Fugas</span>
          </button>

          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Partidas</span>
          </button>

          <button
            onClick={() => onTabChange('inspector')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition shrink-0 ${
              activeTab === 'inspector'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Crosshair size={14} />
            <span>Analizador</span>
          </button>

          <button
            onClick={() => onTabChange('dojo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition shrink-0 relative ${
              activeTab === 'dojo'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BrainCircuit size={14} />
            <span>Dojo SRS</span>
            {duePuzzlesCount > 0 && (
              <span className="w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                {duePuzzlesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('sparring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition shrink-0 ${
              activeTab === 'sparring'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Swords size={14} />
            <span>Revancha & IA</span>
          </button>
        </nav>

        {/* Global actions: Sync + Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Sincronizar partidas con Chess.com"
            className="p-2 text-slate-400 hover:text-slate-100 bg-[#18202c] hover:bg-slate-700/80 border border-slate-700/60 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
          </button>

          <button
            onClick={onOpenSettings}
            title="Ajustes y clave de Gemini"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#18202c] hover:bg-slate-700/80 border border-slate-700/60 rounded-xl transition"
          >
            <Settings size={15} className="text-amber-400" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>
        </div>
      </div>
    </header>
  );
};
