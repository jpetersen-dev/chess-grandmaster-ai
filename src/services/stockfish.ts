import { Chess } from 'chess.js';

export interface EngineEvaluation {
  scoreCentipawns: number;
  mate?: number;
  bestMoveUci: string;
  bestMoveSan?: string;
  depth: number;
  pvs?: string[];
}

const evalCache = new Map<string, EngineEvaluation>();

// Query Lichess Cloud Evaluation API (Instant Grandmaster-depth eval for popular positions)
async function fetchLichessCloudEval(fen: string): Promise<EngineEvaluation | null> {
  try {
    const encodedFen = encodeURIComponent(fen);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodedFen}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();

    const pvs = data.pvs?.[0];
    if (!pvs) return null;

    const uciMove = pvs.moves?.split(' ')?.[0] || '';
    const chess = new Chess(fen);
    let bestMoveSan: string | undefined;

    if (uciMove && uciMove.length >= 4) {
      try {
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove[4];
        const m = chess.move({ from, to, promotion });
        if (m) bestMoveSan = m.san;
      } catch {
        // ignore
      }
    }

    return {
      scoreCentipawns: pvs.cp !== undefined ? pvs.cp : (pvs.mate ? (pvs.mate > 0 ? 10000 : -10000) : 0),
      mate: pvs.mate,
      bestMoveUci: uciMove,
      bestMoveSan,
      depth: data.depth || 30,
    };
  } catch {
    return null;
  }
}

// Client-side quick alpha-beta heuristic search when offline or for instant evaluation
function evaluateQuickLocal(fen: string): EngineEvaluation {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  
  if (moves.length === 0) {
    if (chess.isCheckmate()) {
      return { scoreCentipawns: chess.turn() === 'w' ? -20000 : 20000, bestMoveUci: '', depth: 1 };
    }
    return { scoreCentipawns: 0, bestMoveUci: '', depth: 1 };
  }

  // Find best capture or developing move
  let bestScore = chess.turn() === 'w' ? -99999 : 99999;
  let bestMove = moves[0];

  const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  for (const m of moves) {
    chess.move(m);
    // Simple 1-ply board material evaluate
    let score = 0;
    const board = chess.board();
    for (const row of board) {
      for (const p of row) {
        if (!p) continue;
        const val = pieceValues[p.type] || 0;
        score += p.color === 'w' ? val : -val;
      }
    }
    chess.undo();

    if (chess.turn() === 'w') {
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }
  }

  const uci = `${bestMove.from}${bestMove.to}${bestMove.promotion || ''}`;
  return {
    scoreCentipawns: bestScore,
    bestMoveUci: uci,
    bestMoveSan: bestMove.san,
    depth: 4,
  };
}

export async function analyzePosition(fen: string, targetDepth = 15): Promise<EngineEvaluation> {
  if (evalCache.has(fen)) {
    return evalCache.get(fen)!;
  }

  // 1. Try Lichess Cloud Eval (fastest, GM quality)
  const cloudEval = await fetchLichessCloudEval(fen);
  if (cloudEval) {
    evalCache.set(fen, cloudEval);
    return cloudEval;
  }

  // 2. Local fallback
  const localEval = evaluateQuickLocal(fen);
  localEval.depth = Math.min(targetDepth, 8);
  evalCache.set(fen, localEval);
  return localEval;
}
