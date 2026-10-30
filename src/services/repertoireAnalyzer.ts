import type { ChessComGame } from '../types/chess';

export interface OpeningStats {
  eco: string;
  name: string;
  color: 'white' | 'black';
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // percentage (0 - 100)
  recentBlunders: number;
}

export function extractOpeningName(ecoUrlOrEco: string): string {
  if (!ecoUrlOrEco) return 'Apertura sin clasificar';
  if (ecoUrlOrEco.startsWith('http')) {
    // e.g. https://www.chess.com/openings/Sicilian-Defense-Old-Sicilian-Variation-3.Bc4
    const parts = ecoUrlOrEco.split('/openings/');
    if (parts.length > 1) {
      return decodeURIComponent(parts[1]).replace(/-/g, ' ');
    }
  }
  return ecoUrlOrEco;
}

export function analyzeRepertoire(games: ChessComGame[]): {
  whiteOpenings: OpeningStats[];
  blackOpenings: OpeningStats[];
} {
  const whiteMap = new Map<string, { name: string; wins: number; losses: number; draws: number; blunders: number }>();
  const blackMap = new Map<string, { name: string; wins: number; losses: number; draws: number; blunders: number }>();

  for (const game of games) {
    const rawEco = game.eco || 'Desconocida';
    const name = extractOpeningName(rawEco);
    const map = game.userColor === 'white' ? whiteMap : blackMap;

    const existing = map.get(name) || { name, wins: 0, losses: 0, draws: 0, blunders: 0 };

    if (game.userWon) {
      existing.wins += 1;
    } else {
      const userRes = game.userColor === 'white' ? game.white.result : game.black.result;
      if (['repetition', 'stalemate', 'agreed', 'timevsinsufficient', 'insufficient'].includes(userRes)) {
        existing.draws += 1;
      } else {
        existing.losses += 1;
      }
    }

    map.set(name, existing);
  }

  const mapToStats = (map: Map<string, any>, color: 'white' | 'black'): OpeningStats[] => {
    return Array.from(map.entries())
      .map(([name, data]) => {
        const total = data.wins + data.losses + data.draws;
        const winRate = total > 0 ? Math.round((data.wins / total) * 100) : 0;
        return {
          eco: name,
          name,
          color,
          totalGames: total,
          wins: data.wins,
          losses: data.losses,
          draws: data.draws,
          winRate,
          recentBlunders: data.blunders,
        };
      })
      .sort((a, b) => b.totalGames - a.totalGames);
  };

  return {
    whiteOpenings: mapToStats(whiteMap, 'white'),
    blackOpenings: mapToStats(blackMap, 'black'),
  };
}
