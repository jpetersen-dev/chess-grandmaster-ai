import { Chess } from 'chess.js';
import type { ChessComGame } from '../types/chess';
import { parsePgnMoves } from './chesscom';

export interface MoveTreeNode {
  id: string; // e.g. "d4_e5_dxe5"
  san: string;
  ply: number;
  moveNumber: number;
  turn: 'w' | 'b';
  isUserMove: boolean;
  fen: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  lossRate: number;
  children: MoveTreeNode[];
  lossGames: ChessComGame[];
  name?: string;
  leakSeverity?: 'critical' | 'warning' | 'solid';
}

export interface RepertoirePillarData {
  id: 'white_d4' | 'black_sicilian' | 'black_vs_d4';
  title: string;
  subtitle: string;
  perspectiveColor: 'white' | 'black';
  rootMoves: string[];
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  tree: MoveTreeNode;
  criticalLeaks: CriticalLeak[];
}

export interface CriticalLeak {
  id: string;
  title: string;
  lineSan: string[];
  totalGames: number;
  losses: number;
  winRate: number;
  description: string;
  advice: string;
  sampleLosses: ChessComGame[];
  fen: string;
}

const OPENING_LABELS: Record<string, string> = {
  // White 1. d4
  'd4 e5': 'Gambito Englund (⚠️ Alta Fuga)',
  'd4 d5': 'Simétrica / Peón Dama',
  'd4 Nf6': 'Defensas Indias (India de Rey / Nimzo)',
  'd4 e6': 'Defensa Horwitz (prep. d5/f5)',
  'd4 c5': 'Defensa Benoni Antigua',
  'd4 d6': 'Defensa Flanco Rey / Pirc',
  'd4 f5': 'Defensa Holandesa',

  // White 1. d4 d5
  'd4 d5 Nf3': 'Línea Clásica con Caballo f3',
  'd4 d5 Nf3 Nc6': 'Ataque Chigorin / Presión central',
  'd4 d5 Nf3 Nf6': 'Desarrollo Simétrico',
  'd4 d5 Nf3 e6': 'Estructura Sólida Francesa',
  'd4 d5 c4': 'Gambito de Dama',
  'd4 d5 Bf4': 'Sistema Londres',

  // White 1. d4 e5 (Englund)
  'd4 e5 dxe5': 'Englund Aceptado',
  'd4 e5 dxe5 Nc6': 'Englund: Presión sobre e5',
  'd4 e5 dxe5 Nc6 Nf3': 'Defensa del Peón e5',
  'd4 e5 dxe5 Nc6 Nf3 Qe7': 'Ataque Doble de Dama e7',

  // Black vs 1. e4 (c5)
  'e4 c5 Nf3': 'Siciliana Abierta',
  'e4 c5 Nc3': 'Siciliana Cerrada (⚠️ Presión Flanco)',
  'e4 c5 d4': 'Gambito Smith-Morra / Centro',
  'e4 c5 Bc4': 'Ataque Bowdler',
  'e4 c5 c3': 'Variante Alapin (⚠️ Mayor Fuga)',
  'e4 c5 f4': 'Ataque Grand Prix',

  // Black vs 1. d4
  'd4 d6 Nf3': 'Blanco responde con Nf3 ante d6',
  'd4 d6 e4': 'Transposición a Defensa Pirc',
  'd4 d6 c4': 'Estructura de India de Rey',
};

export function getOpeningLabel(moves: string[]): string {
  const key = moves.slice(0, 4).join(' ');
  if (OPENING_LABELS[key]) return OPENING_LABELS[key];
  const shortKey = moves.slice(0, 2).join(' ');
  if (OPENING_LABELS[shortKey]) return OPENING_LABELS[shortKey];
  return '';
}

export function buildRepertoirePillars(games: ChessComGame[]): {
  whiteD4: RepertoirePillarData;
  blackSicilian: RepertoirePillarData;
  blackVsD4: RepertoirePillarData;
} {
  const parsedGames = games.map((g) => {
    const moves = g.moves && g.moves.length > 0 ? g.moves : parsePgnMoves(g.pgn);
    return {
      game: g,
      userColor: g.userColor,
      userWon: g.userWon,
      isDraw: ['repetition', 'stalemate', 'agreed', 'timevsinsufficient', 'insufficient'].includes(
        g.userColor === 'white' ? g.white.result : g.black.result
      ),
      sans: moves.map((m) => m.san),
    };
  });

  const buildTree = (
    relevantGames: typeof parsedGames,
    userColor: 'white' | 'black',
    rootMoves: string[],
    maxPly = 12
  ): MoveTreeNode => {
    const buildNode = (
      prefixMoves: string[],
      currentPly: number,
      filteredGames: typeof relevantGames
    ): MoveTreeNode => {
      const isWhiteTurn = currentPly % 2 === 0;
      const turn: 'w' | 'b' = isWhiteTurn ? 'w' : 'b';
      const isUserMove = (userColor === 'white' && isWhiteTurn) || (userColor === 'black' && !isWhiteTurn);

      const total = filteredGames.length;
      const wins = filteredGames.filter((g) => g.userWon).length;
      const losses = filteredGames.filter((g) => !g.userWon && !g.isDraw).length;
      const draws = filteredGames.filter((g) => g.isDraw).length;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      const lossRate = total > 0 ? Math.round((losses / total) * 100) : 0;

      let leakSeverity: 'critical' | 'warning' | 'solid' = 'solid';
      if (total >= 5) {
        if (winRate < 45 || lossRate > 52) leakSeverity = 'critical';
        else if (winRate < 50) leakSeverity = 'warning';
      }

      const tempChess = new Chess();
      for (const san of prefixMoves) {
        try {
          tempChess.move(san);
        } catch {
          break;
        }
      }

      const nextMoveMap = new Map<string, typeof relevantGames>();
      for (const g of filteredGames) {
        if (g.sans.length > currentPly) {
          const nextSan = g.sans[currentPly];
          if (!nextMoveMap.has(nextSan)) {
            nextMoveMap.set(nextSan, []);
          }
          nextMoveMap.get(nextSan)!.push(g);
        }
      }

      const sortedNextMoves = Array.from(nextMoveMap.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 3);

      const children: MoveTreeNode[] = [];
      if (currentPly < maxPly) {
        for (const [nextSan, subGames] of sortedNextMoves) {
          children.push(buildNode([...prefixMoves, nextSan], currentPly + 1, subGames));
        }
      }

      const lastSan = prefixMoves.length > 0 ? prefixMoves[prefixMoves.length - 1] : '';
      const moveNumber = Math.floor((currentPly - 1) / 2) + 1;

      return {
        id: prefixMoves.join('_') || 'root',
        san: lastSan,
        ply: currentPly,
        moveNumber: Math.max(1, moveNumber),
        turn,
        isUserMove,
        fen: tempChess.fen(),
        totalGames: total,
        wins,
        losses,
        draws,
        winRate,
        lossRate,
        children,
        lossGames: filteredGames.filter((g) => !g.userWon && !g.isDraw).map((g) => g.game),
        name: getOpeningLabel(prefixMoves),
        leakSeverity,
      };
    };

    return buildNode(rootMoves, rootMoves.length, relevantGames);
  };

  // 1. Pillar: White 1. d4
  const whiteD4Games = parsedGames.filter((g) => g.userColor === 'white' && g.sans[0] === 'd4');
  const whiteD4Tree = buildTree(whiteD4Games, 'white', ['d4'], 12);

  // 2. Pillar: Black vs 1. e4 (c5 Sicilian)
  const blackSicilianGames = parsedGames.filter(
    (g) => g.userColor === 'black' && g.sans[0] === 'e4' && g.sans[1] === 'c5'
  );
  const blackSicilianTree = buildTree(blackSicilianGames, 'black', ['e4', 'c5'], 12);

  // 3. Pillar: Black vs 1. d4 (with d6, d5 or Nf6)
  const blackVsD4Games = parsedGames.filter((g) => g.userColor === 'black' && g.sans[0] === 'd4');
  const blackVsD4Tree = buildTree(blackVsD4Games, 'black', ['d4'], 12);

  const extractLeaks = (tree: MoveTreeNode): CriticalLeak[] => {
    const leaks: CriticalLeak[] = [];

    const traverse = (node: MoveTreeNode, path: string[]) => {
      const currentPath = node.san ? [...path, node.san] : path;
      if (node.totalGames >= 5 && node.lossRate >= 50 && node.losses >= 3) {
        let advice = 'Prepara el enroque rápido y asegura tus casillas débiles antes de atacar.';
        let desc = `Pierdes el ${node.lossRate}% de las veces en esta línea (${node.losses} derrotas de ${node.totalGames} partidas).`;

        const joined = currentPath.join(' ');
        if (joined.includes('d4 e5')) {
          desc = 'Gambito Englund: Los rivales buscan trampas rápidas de dama (Qe7/Qb4+) contra tu peón de b2.';
          advice = 'No defiendas el peón con Bf4 inmediatamente si la dama salta a b4+. Desarrolla con Nc3 y Nf3 asegurando c2 y b2.';
        } else if (joined.includes('e4 c5 c3')) {
          desc = 'Variante Alapin: El blanco prepara el centro d4 con apoyo de peón en c3.';
          advice = 'Golpea el centro de inmediato con 2... d5! o 2... Nf6 castigando que el caballo blanco no puede ir a c3.';
        } else if (joined.includes('d4 d6')) {
          desc = 'Defensa con d6: El blanco suele ganar espacio central con e4 y c4 antes de que completes tu enroque.';
          advice = 'Acelera el fianchetto con g6, Bg7 y 0-0. No gastes tiempos en movimientos pasivos de dama.';
        }

        leaks.push({
          id: node.id,
          title: node.name || `Línea ${currentPath.slice(0, 4).join(' ')}`,
          lineSan: currentPath,
          totalGames: node.totalGames,
          losses: node.losses,
          winRate: node.winRate,
          description: desc,
          advice,
          sampleLosses: node.lossGames.slice(0, 10),
          fen: node.fen,
        });
      }

      for (const child of node.children) {
        traverse(child, currentPath);
      }
    };

    traverse(tree, []);
    return leaks.sort((a, b) => b.losses - a.losses).slice(0, 5);
  };

  return {
    whiteD4: {
      id: 'white_d4',
      title: 'Blancas: Tu Sistema 1. d4',
      subtitle: 'Tus 3 principales respuestas del rival y sus 3 variantes hasta la jugada 6',
      perspectiveColor: 'white',
      rootMoves: ['d4'],
      totalGames: whiteD4Games.length,
      wins: whiteD4Games.filter((g) => g.userWon).length,
      losses: whiteD4Games.filter((g) => !g.userWon && !g.isDraw).length,
      draws: whiteD4Games.filter((g) => g.isDraw).length,
      winRate: whiteD4Games.length > 0 ? Math.round((whiteD4Games.filter((g) => g.userWon).length / whiteD4Games.length) * 100) : 0,
      tree: whiteD4Tree,
      criticalLeaks: extractLeaks(whiteD4Tree),
    },
    blackSicilian: {
      id: 'black_sicilian',
      title: 'Negras: Tu Siciliana 1. e4 c5',
      subtitle: 'Cómo te juegan los rivales (2. Nf3, 2. Nc3, 2. c3...) y dónde fallas más',
      perspectiveColor: 'black',
      rootMoves: ['e4', 'c5'],
      totalGames: blackSicilianGames.length,
      wins: blackSicilianGames.filter((g) => g.userWon).length,
      losses: blackSicilianGames.filter((g) => !g.userWon && !g.isDraw).length,
      draws: blackSicilianGames.filter((g) => g.isDraw).length,
      winRate: blackSicilianGames.length > 0 ? Math.round((blackSicilianGames.filter((g) => g.userWon).length / blackSicilianGames.length) * 100) : 0,
      tree: blackSicilianTree,
      criticalLeaks: extractLeaks(blackSicilianTree),
    },
    blackVsD4: {
      id: 'black_vs_d4',
      title: 'Negras ante 1. d4 (Tu Setup Flanco Rey)',
      subtitle: 'Tus respuestas con 1... d6 / d5 / Nf6 buscando enroque rápido y sólido',
      perspectiveColor: 'black',
      rootMoves: ['d4'],
      totalGames: blackVsD4Games.length,
      wins: blackVsD4Games.filter((g) => g.userWon).length,
      losses: blackVsD4Games.filter((g) => !g.userWon && !g.isDraw).length,
      draws: blackVsD4Games.filter((g) => g.isDraw).length,
      winRate: blackVsD4Games.length > 0 ? Math.round((blackVsD4Games.filter((g) => g.userWon).length / blackVsD4Games.length) * 100) : 0,
      tree: blackVsD4Tree,
      criticalLeaks: extractLeaks(blackVsD4Tree),
    },
  };
}
