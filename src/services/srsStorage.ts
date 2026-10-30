import type { SRSPuzzle, TacticTag } from '../types/chess';

const STORAGE_KEY = 'chess_trainer_srs_puzzles';

export function getStoredPuzzles(): SRSPuzzle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredPuzzles(puzzles: SRSPuzzle[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
  } catch (err) {
    console.error('Error saving puzzles to localStorage', err);
  }
}

export function addBlunderToDojo(params: {
  fen: string;
  turn: 'w' | 'b';
  userColor: 'w' | 'b';
  userMoveSan: string;
  bestMoveSan: string;
  bestMoveUci: string;
  explanation: string;
  tacticTag: TacticTag;
  tacticSummary: string;
  sourceGameUrl?: string;
  timeControl?: string;
}): SRSPuzzle {
  const puzzles = getStoredPuzzles();
  
  // Prevent duplicate positions
  const existing = puzzles.find((p) => p.fen === params.fen);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const newPuzzle: SRSPuzzle = {
    id: 'pz_' + Math.random().toString(36).substring(2, 9),
    fen: params.fen,
    turn: params.turn,
    userColor: params.userColor,
    userMoveSan: params.userMoveSan,
    bestMoveSan: params.bestMoveSan,
    bestMoveUci: params.bestMoveUci,
    explanation: params.explanation,
    tacticTag: params.tacticTag,
    tacticSummary: params.tacticSummary,
    sourceGameUrl: params.sourceGameUrl,
    timeControl: params.timeControl,
    dateAdded: now,
    interval: 1, // Start with 1 day
    repetitions: 0,
    easeFactor: 2.5,
    nextReviewDate: now, // Ready to review right now
  };

  puzzles.unshift(newPuzzle);
  saveStoredPuzzles(puzzles);
  return newPuzzle;
}

export function recordPuzzleReview(puzzleId: string, success: boolean): SRSPuzzle | null {
  const puzzles = getStoredPuzzles();
  const idx = puzzles.findIndex((p) => p.id === puzzleId);
  if (idx === -1) return null;

  const p = puzzles[idx];
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  if (success) {
    p.repetitions += 1;
    if (p.repetitions === 1) {
      p.interval = 1;
    } else if (p.repetitions === 2) {
      p.interval = 3;
    } else if (p.repetitions === 3) {
      p.interval = 7;
    } else if (p.repetitions === 4) {
      p.interval = 14;
    } else {
      p.interval = Math.round(p.interval * 2.2);
    }
    p.nextReviewDate = Date.now() + p.interval * ONE_DAY_MS;
  } else {
    // Reset on failure
    p.repetitions = 0;
    p.interval = 1;
    p.nextReviewDate = Date.now() + ONE_DAY_MS; // Review again tomorrow
  }

  puzzles[idx] = p;
  saveStoredPuzzles(puzzles);
  return p;
}

export function getDuePuzzles(): SRSPuzzle[] {
  const puzzles = getStoredPuzzles();
  const now = Date.now();
  return puzzles.filter((p) => p.nextReviewDate <= now);
}

export function deletePuzzle(puzzleId: string) {
  const puzzles = getStoredPuzzles().filter((p) => p.id !== puzzleId);
  saveStoredPuzzles(puzzles);
}
