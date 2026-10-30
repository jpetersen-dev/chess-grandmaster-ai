import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';
import type { ParsedMove, MoveClassification, TacticTag } from '../types/chess';

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'peón',
  n: 'caballo',
  b: 'alfil',
  r: 'torre',
  q: 'dama',
  k: 'rey',
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Simple heuristic material count & positional balance
export function evaluatePositionRough(fen: string): number {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -20000 : 20000;
  }
  if (chess.isDraw()) {
    return 0;
  }

  let whiteScore = 0;
  let blackScore = 0;

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const val = PIECE_VALUES[piece.type];
      // Center control bonus
      const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
      const positional = (7 - centerDist) * 5;

      if (piece.color === 'w') {
        whiteScore += val + positional;
      } else {
        blackScore += val + positional;
      }
    }
  }

  return whiteScore - blackScore;
}

export interface TacticalDiagnosis {
  classification: MoveClassification;
  tacticTag: TacticTag;
  summary: string;
  bestMoveSan?: string;
  bestMoveUci?: string;
}

export function diagnoseMoveTactics(
  move: ParsedMove,
  _isUserColor: boolean,
  evalDrop: number
): TacticalDiagnosis {
  const chessAfter = new Chess(move.fenAfter);
  const turn = move.color;
  const opponentTurn = turn === 'w' ? 'b' : 'w';

  // 1. Time-related psychological heuristics
  if (move.timeSpentSeconds !== undefined && move.timeSpentSeconds < 1.4 && evalDrop >= 150) {
    return {
      classification: 'blunder',
      tacticTag: 'impulsive',
      summary: `Jugada impulsiva (${move.timeSpentSeconds}s). Te apresuraste sin verificar las amenazas del oponente.`,
    };
  }

  if (move.clockSeconds !== undefined && move.clockSeconds < 10 && evalDrop >= 150) {
    return {
      classification: 'blunder',
      tacticTag: 'time_panic',
      summary: `Apuro de reloj (${Math.round(move.clockSeconds)}s restantes). La presión del tiempo provocó una omisión crítica.`,
    };
  }

  // 2. Checkmate omission / Checkmate allowed
  if (chessAfter.isCheckmate()) {
    return {
      classification: 'blunder',
      tacticTag: 'back_rank',
      summary: `Recibiste jaque mate. La posición del rey quedó desprotegida o sin casillas de escape.`,
    };
  }

  // 3. Hanging piece detection (Did player leave moved piece hanging or walk into attack?)
  if (move.to) {
    const toSquare = move.to as Square;
    const movedPiece = chessAfter.get(toSquare);

    if (movedPiece) {
      const pieceName = PIECE_NAMES[movedPiece.type];
      const isAttacked = chessAfter.isAttacked(toSquare, opponentTurn);

      if (isAttacked && movedPiece.type !== 'p') {
        return {
          classification: 'blunder',
          tacticTag: 'hanging_piece',
          summary: `Colgaste tu ${pieceName} en ${toSquare}. La casilla estaba dominada por el rival.`,
        };
      }
    }
  }

  // 4. Undefended friendly piece left hanging elsewhere
  const boardAfter = chessAfter.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = boardAfter[r][c];
      if (!piece || piece.color !== turn || piece.type === 'k') continue;

      const file = String.fromCharCode(97 + c);
      const rank = 8 - r;
      const sq = `${file}${rank}` as Square;

      const attacked = chessAfter.isAttacked(sq, opponentTurn);
      if (attacked && PIECE_VALUES[piece.type] >= 300 && evalDrop >= 200) {
        return {
          classification: 'blunder',
          tacticTag: 'hanging_piece',
          summary: `Tu ${PIECE_NAMES[piece.type]} en ${sq} quedó desamparado y vulnerable al ataque enemigo.`,
        };
      }
    }
  }

  // General classification by evaluation swing
  if (evalDrop >= 250) {
    return {
      classification: 'blunder',
      tacticTag: 'general',
      summary: `Grave error táctico: perdiste el control de la posición y concediste una ventaja decisiva.`,
    };
  } else if (evalDrop >= 120) {
    return {
      classification: 'mistake',
      tacticTag: 'general',
      summary: `Imprecisión importante: cediste la iniciativa táctica al rival.`,
    };
  } else if (evalDrop >= 60) {
    return {
      classification: 'inaccuracy',
      tacticTag: 'general',
      summary: `Jugada dudosa: existían continuaciones más directas y armoniosas.`,
    };
  }

  return {
    classification: 'good',
    tacticTag: 'general',
    summary: `Buena jugada: mantiene el equilibrio y la estructura.`,
  };
}
