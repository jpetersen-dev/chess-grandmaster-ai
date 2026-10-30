import { Chess } from 'chess.js';
import type { ChessComProfile, ChessComGame, ParsedMove } from '../types/chess';

const BASE_URL = 'https://api.chess.com/pub/player';

export async function fetchUserProfile(username: string): Promise<ChessComProfile> {
  const profileRes = await fetch(`${BASE_URL}/${username}`);
  if (!profileRes.ok) {
    throw new Error(`No se pudo cargar el perfil de ${username} en Chess.com`);
  }
  const profileData = await profileRes.json();

  // Fetch stats
  const statsRes = await fetch(`${BASE_URL}/${username}/stats`);
  let statsData: any = {};
  if (statsRes.ok) {
    statsData = await statsRes.json();
  }

  return {
    username: profileData.username,
    avatar: profileData.avatar,
    country: profileData.country,
    bullet: statsData.chess_bullet ? {
      rating: statsData.chess_bullet.last?.rating ?? 0,
      bestRating: statsData.chess_bullet.best?.rating ?? 0,
      wins: statsData.chess_bullet.record?.win ?? 0,
      losses: statsData.chess_bullet.record?.loss ?? 0,
      draws: statsData.chess_bullet.record?.draw ?? 0,
    } : undefined,
    blitz: statsData.chess_blitz ? {
      rating: statsData.chess_blitz.last?.rating ?? 0,
      bestRating: statsData.chess_blitz.best?.rating ?? 0,
      wins: statsData.chess_blitz.record?.win ?? 0,
      losses: statsData.chess_blitz.record?.loss ?? 0,
      draws: statsData.chess_blitz.record?.draw ?? 0,
    } : undefined,
    rapid: statsData.chess_rapid ? {
      rating: statsData.chess_rapid.last?.rating ?? 0,
      bestRating: statsData.chess_rapid.best?.rating ?? 0,
      wins: statsData.chess_rapid.record?.win ?? 0,
      losses: statsData.chess_rapid.record?.loss ?? 0,
      draws: statsData.chess_rapid.record?.draw ?? 0,
    } : undefined,
    tacticsRating: statsData.tactics?.highest?.rating ?? undefined,
  };
}

export async function fetchUserArchives(username: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/${username}/games/archives`);
  if (!res.ok) throw new Error('Error al consultar archivos mensuales de partidas');
  const data = await res.json();
  return (data.archives as string[]) || [];
}

export async function fetchGamesFromArchive(archiveUrl: string, targetUsername: string): Promise<ChessComGame[]> {
  const res = await fetch(archiveUrl);
  if (!res.ok) throw new Error(`Error al descargar partidas de ${archiveUrl}`);
  const data = await res.json();
  const rawGames = data.games || [];

  const parsedGames: ChessComGame[] = [];
  const normalizedUser = targetUsername.toLowerCase();

  for (const raw of rawGames) {
    const isWhite = raw.white?.username?.toLowerCase() === normalizedUser;
    const isBlack = raw.black?.username?.toLowerCase() === normalizedUser;
    if (!isWhite && !isBlack) continue;

    const userColor = isWhite ? 'white' : 'black';
    const userResult = isWhite ? raw.white.result : raw.black.result;
    const userWon = userResult === 'win';

    parsedGames.push({
      url: raw.url,
      pgn: raw.pgn,
      time_control: raw.time_control || '',
      time_class: raw.time_class || 'blitz',
      end_time: raw.end_time || 0,
      rated: Boolean(raw.rated),
      fen: raw.fen || '',
      white: {
        username: raw.white?.username || 'Blanco',
        rating: raw.white?.rating || 0,
        result: raw.white?.result || '',
      },
      black: {
        username: raw.black?.username || 'Negro',
        rating: raw.black?.rating || 0,
        result: raw.black?.result || '',
      },
      eco: raw.eco || raw.eco_url || '',
      eco_url: raw.eco_url || '',
      userColor,
      userWon,
    });
  }

  return parsedGames.reverse(); // Most recent first
}

function parseClockString(clkStr: string): number {
  // Example: "0:01:54.8" or "0:02:00"
  const parts = clkStr.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

export function parsePgnMoves(pgn: string): ParsedMove[] {
  if (!pgn) return [];
  const chess = new Chess();
  const moves: ParsedMove[] = [];

  // Match token pairs: move notation + optional {[%clk ...]}
  // e.g. "1. e4 {[%clk 0:02:00.1]} 1... c5 {[%clk 0:01:59.4]}"
  const moveRegex = /(?:(\d+)\.+)?\s*([a-zA-Z0-9#+=\-O]+)(?:\s*\{[^}]*\[%clk\s+([0-9:.]+)\][^}]*\})?/g;

  let match;
  let moveNum = 1;
  let lastClockWhite: number | null = null;
  let lastClockBlack: number | null = null;
  let ply = 0;

  // Extract only the move text part (after headers)
  const headerEndIdx = pgn.lastIndexOf(']\n\n');
  const moveText = headerEndIdx !== -1 ? pgn.substring(headerEndIdx + 3) : pgn;

  while ((match = moveRegex.exec(moveText)) !== null) {
    const rawSan = match[2];
    if (['1-0', '0-1', '1/2-1/2', '*'].includes(rawSan)) continue;
    if (match[1]) moveNum = parseInt(match[1], 10);

    const clkStr = match[3];
    const clockSeconds = clkStr ? parseClockString(clkStr) : undefined;

    const fenBefore = chess.fen();
    const turn = chess.turn();

    try {
      const moveResult = chess.move(rawSan);
      if (!moveResult) break;

      ply++;
      let timeSpentSeconds: number | undefined;

      if (clockSeconds !== undefined) {
        if (turn === 'w') {
          if (lastClockWhite !== null) {
            timeSpentSeconds = Math.max(0, Math.round((lastClockWhite - clockSeconds) * 10) / 10);
          }
          lastClockWhite = clockSeconds;
        } else {
          if (lastClockBlack !== null) {
            timeSpentSeconds = Math.max(0, Math.round((lastClockBlack - clockSeconds) * 10) / 10);
          }
          lastClockBlack = clockSeconds;
        }
      }

      moves.push({
        ply,
        moveNumber: moveNum,
        color: turn,
        san: moveResult.san,
        uci: `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`,
        from: moveResult.from,
        to: moveResult.to,
        fenBefore,
        fenAfter: chess.fen(),
        clockSeconds,
        timeSpentSeconds,
      });
    } catch {
      // End of valid moves or non-standard notation
      break;
    }
  }

  return moves;
}
