export type MoveClassification = 'blunder' | 'mistake' | 'inaccuracy' | 'good' | 'best' | 'book';

export type TacticTag = 
  | 'hanging_piece'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'back_rank'
  | 'missed_mate'
  | 'time_panic'
  | 'impulsive'
  | 'book_deviation'
  | 'general';

export interface ParsedMove {
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  uci?: string;
  from?: string;
  to?: string;
  fenBefore: string;
  fenAfter: string;
  clockSeconds?: number;
  timeSpentSeconds?: number;
  evalBefore?: number; // In centipawns or mate format
  evalAfter?: number;
  deltaEval?: number;
  bestMoveSan?: string;
  bestMoveUci?: string;
  classification?: MoveClassification;
  tacticTag?: TacticTag;
  tacticSummary?: string;
  geminiExplanation?: string;
}

export interface ChessComPlayerStats {
  rating: number;
  bestRating?: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface ChessComProfile {
  username: string;
  avatar?: string;
  country?: string;
  bullet?: ChessComPlayerStats;
  blitz?: ChessComPlayerStats;
  rapid?: ChessComPlayerStats;
  tacticsRating?: number;
}

export interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  time_class: 'bullet' | 'blitz' | 'rapid' | 'daily';
  end_time: number;
  rated: boolean;
  fen: string;
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
  eco?: string;
  eco_url?: string;
  userColor: 'white' | 'black';
  userWon: boolean;
  moves?: ParsedMove[];
  analyzed?: boolean;
}

export interface SRSPuzzle {
  id: string;
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
  dateAdded: number;
  interval: number; // in days
  repetitions: number;
  easeFactor: number;
  nextReviewDate: number; // timestamp
}
