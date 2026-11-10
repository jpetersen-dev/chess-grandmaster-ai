import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import type { ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { GameInspectorView } from './components/GameInspectorView';
import { DojoView } from './components/DojoView';
import { RepertoireExplorerView } from './components/RepertoireExplorerView';
import { PlayVsAiView } from './components/PlayVsAiView';
import { SettingsModal } from './components/SettingsModal';
import type { ChessComProfile, ChessComGame } from './types/chess';
import {
  fetchUserProfile,
  fetchRecentGames,
} from './services/chesscom';
import { getDuePuzzles, getStoredPuzzles } from './services/srsStorage';

export function App() {
  const [username] = useState<string>('jpeza');
  const [profile, setProfile] = useState<ChessComProfile | null>(null);
  const [games, setGames] = useState<ChessComGame[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<string>('Conectando con Chess.com...');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('repertoire');
  const [selectedGame, setSelectedGame] = useState<ChessComGame | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [duePuzzlesCount, setDuePuzzlesCount] = useState<number>(0);

  // Sparring customized line state
  const [sparringFen, setSparringFen] = useState<string | undefined>(undefined);
  const [sparringColor, setSparringColor] = useState<'white' | 'black'>('white');
  const [sparringLineName, setSparringLineName] = useState<string | undefined>(undefined);

  const updatePuzzlesCount = useCallback(() => {
    const due = getDuePuzzles();
    setDuePuzzlesCount(due.length > 0 ? due.length : getStoredPuzzles().length);
  }, []);

  // Fetch games & profile from Chess.com
  const loadUserData = useCallback(async (targetUser: string) => {
    try {
      setIsRefreshing(true);
      setIsLoading(true);
      setLoadProgress('Cargando perfil y rating...');
      const userProfile = await fetchUserProfile(targetUser);
      setProfile(userProfile);

      setLoadProgress('Recopilando partidas recientes para el árbol de aperturas...');
      // Fetch 4 months of games to get ~800 to 1200 games for robust tree branches
      const downloadedGames = await fetchRecentGames(targetUser, 4, (loaded, total) => {
        setLoadProgress(`Descargando historial: mes ${loaded} de ${total}...`);
      });

      setGames(downloadedGames);
      if (downloadedGames.length > 0 && !selectedGame) {
        setSelectedGame(downloadedGames[0]);
      }
    } catch (err) {
      console.error('Error fetching Chess.com data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      updatePuzzlesCount();
    }
  }, [selectedGame, updatePuzzlesCount]);

  useEffect(() => {
    loadUserData(username);
  }, [loadUserData, username]);

  const handleSelectGame = (game: ChessComGame) => {
    setSelectedGame(game);
    setActiveTab('inspector');
  };

  const handleQuickTrain = () => {
    setActiveTab('dojo');
  };

  const handleLaunchSparring = (fen: string, color: 'white' | 'black', lineName: string) => {
    setSparringFen(fen);
    setSparringColor(color);
    setSparringLineName(lineName);
    setActiveTab('sparring');
  };

  const handleClearSparringLine = () => {
    setSparringFen(undefined);
    setSparringLineName(undefined);
  };

  return (
    <div className="min-h-screen bg-[#0f141c] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar
        profile={profile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={() => loadUserData(username)}
        isRefreshing={isRefreshing}
        duePuzzlesCount={duePuzzlesCount}
      />

      {/* Progress banner when fetching multiple months */}
      {isLoading && (
        <div className="bg-emerald-950/60 border-b border-emerald-500/30 py-2 px-4 text-center text-xs font-mono text-emerald-300 flex items-center justify-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>{loadProgress}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'repertoire' && (
          <RepertoireExplorerView
            games={games}
            onInspectGame={handleSelectGame}
            onLaunchSparringLine={handleLaunchSparring}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            games={games}
            isLoading={isLoading}
            onSelectGame={handleSelectGame}
            onQuickTrain={handleQuickTrain}
            duePuzzlesCount={duePuzzlesCount}
          />
        )}

        {activeTab === 'inspector' && selectedGame && (
          <GameInspectorView
            game={selectedGame}
            onBack={() => setActiveTab('repertoire')}
            onGoToDojo={() => setActiveTab('dojo')}
          />
        )}

        {activeTab === 'inspector' && !selectedGame && (
          <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
            Selecciona una partida en el panel principal o desde una línea de aperturas para analizarla.
          </div>
        )}

        {activeTab === 'dojo' && (
          <DojoView games={games} />
        )}

        {activeTab === 'sparring' && (
          <PlayVsAiView
            initialFen={sparringFen}
            initialColor={sparringColor}
            lineName={sparringLineName}
            onClearLine={handleClearSparringLine}
          />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          updatePuzzlesCount();
        }}
      />
    </div>
  );
}

export default App;
