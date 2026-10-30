import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import type { ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { GameInspectorView } from './components/GameInspectorView';
import { DojoView } from './components/DojoView';
import { RepertoireView } from './components/RepertoireView';
import { PlayVsAiView } from './components/PlayVsAiView';
import { SettingsModal } from './components/SettingsModal';
import type { ChessComProfile, ChessComGame } from './types/chess';
import {
  fetchUserProfile,
  fetchUserArchives,
  fetchGamesFromArchive,
} from './services/chesscom';
import { getDuePuzzles, getStoredPuzzles } from './services/srsStorage';

export function App() {
  const [username] = useState<string>('jpeza');
  const [profile, setProfile] = useState<ChessComProfile | null>(null);
  const [games, setGames] = useState<ChessComGame[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedGame, setSelectedGame] = useState<ChessComGame | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [duePuzzlesCount, setDuePuzzlesCount] = useState<number>(0);

  const updatePuzzlesCount = useCallback(() => {
    const due = getDuePuzzles();
    setDuePuzzlesCount(due.length > 0 ? due.length : getStoredPuzzles().length);
  }, []);

  // Fetch games & profile from Chess.com
  const loadUserData = useCallback(async (targetUser: string) => {
    try {
      setIsRefreshing(true);
      const userProfile = await fetchUserProfile(targetUser);
      setProfile(userProfile);

      const archives = await fetchUserArchives(targetUser);
      if (archives.length > 0) {
        // Fetch from the latest archive (most recent month)
        const lastArchive = archives[archives.length - 1];
        const downloadedGames = await fetchGamesFromArchive(lastArchive, targetUser);
        setGames(downloadedGames);
        if (downloadedGames.length > 0 && !selectedGame) {
          setSelectedGame(downloadedGames[0]);
        }
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

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
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
            onBack={() => setActiveTab('dashboard')}
            onGoToDojo={() => setActiveTab('dojo')}
          />
        )}

        {activeTab === 'inspector' && !selectedGame && (
          <div className="bg-[#18202c] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
            Por favor selecciona una partida en el panel principal para analizarla.
          </div>
        )}

        {activeTab === 'dojo' && (
          <DojoView games={games} />
        )}

        {activeTab === 'repertoire' && (
          <RepertoireView games={games} />
        )}

        {activeTab === 'sparring' && (
          <PlayVsAiView />
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
