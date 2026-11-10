import { Chess } from 'chess.js';

export interface StockfishResult {
  bestMoveUci: string;
  bestMoveSan?: string;
  scoreCentipawns: number;
  depth: number;
  mate?: number;
}

class StockfishEngineService {
  private worker: Worker | null = null;
  public isReady: boolean = false;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      this.worker = new Worker('/stockfish.js');
      this.readyPromise = new Promise((resolve) => {
        const handler = (e: MessageEvent) => {
          const msg = typeof e.data === 'string' ? e.data : '';
          if (msg.includes('uciok') || msg.includes('readyok')) {
            this.isReady = true;
            resolve();
          }
        };

        if (this.worker) {
          this.worker.addEventListener('message', handler);
          this.worker.postMessage('uci');
          this.worker.postMessage('isready');
        }
      });
    } catch (err) {
      console.warn('Could not initialize Stockfish Web Worker:', err);
      this.worker = null;
    }
  }

  public async setElo(elo: number) {
    if (!this.worker) return;
    await this.readyPromise;

    // Convert requested Elo (500 - 2800) to UCI parameters
    const clampedElo = Math.max(800, Math.min(2850, elo));
    // Skill level maps 0 to 20
    const skillLevel = Math.max(0, Math.min(20, Math.round(((clampedElo - 800) / 2050) * 20)));

    this.worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
    this.worker.postMessage(`setoption name UCI_LimitStrength value true`);
    this.worker.postMessage(`setoption name UCI_Elo value ${clampedElo}`);
  }

  public async calculateBestMove(fen: string, elo = 1800, targetDepth = 12): Promise<StockfishResult> {
    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      return {
        bestMoveUci: '',
        scoreCentipawns: chess.isCheckmate() ? (chess.turn() === 'w' ? -20000 : 20000) : 0,
        depth: 0,
      };
    }

    if (!this.worker) {
      return this.fallbackAnalysis(fen);
    }

    await this.readyPromise;
    await this.setElo(elo);

    return new Promise((resolve) => {
      let scoreCp = 0;
      let mateScore: number | undefined;
      let depthFound = targetDepth;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.worker?.removeEventListener('message', onMessage);
          this.fallbackAnalysis(fen).then(resolve);
        }
      }, 2500);

      const onMessage = (e: MessageEvent) => {
        const msg = typeof e.data === 'string' ? e.data : '';

        // Extract score
        if (msg.includes('score cp ')) {
          const match = msg.match(/score cp (-?\d+)/);
          if (match) scoreCp = parseInt(match[1], 10);
        } else if (msg.includes('score mate ')) {
          const match = msg.match(/score mate (-?\d+)/);
          if (match) {
            mateScore = parseInt(match[1], 10);
            scoreCp = mateScore > 0 ? 10000 : -10000;
          }
        }

        if (msg.startsWith('bestmove')) {
          clearTimeout(timeout);
          if (resolved) return;
          resolved = true;
          this.worker?.removeEventListener('message', onMessage);

          const parts = msg.split(' ');
          const bestMoveUci = parts[1] || '';
          let bestMoveSan: string | undefined;

          if (bestMoveUci && bestMoveUci.length >= 4) {
            try {
              const from = bestMoveUci.substring(0, 2);
              const to = bestMoveUci.substring(2, 4);
              const promotion = bestMoveUci[4];
              const testM = chess.move({ from, to, promotion });
              if (testM) bestMoveSan = testM.san;
            } catch {
              // ignore
            }
          }

          resolve({
            bestMoveUci,
            bestMoveSan,
            scoreCentipawns: chess.turn() === 'w' ? scoreCp : -scoreCp,
            depth: depthFound,
            mate: mateScore,
          });
        }
      };

      this.worker!.addEventListener('message', onMessage);
      this.worker!.postMessage(`position fen ${fen}`);
      this.worker!.postMessage(`go depth ${targetDepth}`);
    });
  }

  private async fallbackAnalysis(fen: string): Promise<StockfishResult> {
    try {
      const encodedFen = encodeURIComponent(fen);
      const res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodedFen}`);
      if (res.ok) {
        const data = await res.json();
        const pvs = data.pvs?.[0];
        if (pvs) {
          const uciMove = pvs.moves?.split(' ')?.[0] || '';
          const chess = new Chess(fen);
          let bestMoveSan: string | undefined;
          if (uciMove) {
            const m = chess.move({
              from: uciMove.substring(0, 2),
              to: uciMove.substring(2, 4),
              promotion: uciMove[4],
            });
            if (m) bestMoveSan = m.san;
          }
          return {
            bestMoveUci: uciMove,
            bestMoveSan,
            scoreCentipawns: pvs.cp || 0,
            depth: data.depth || 20,
            mate: pvs.mate,
          };
        }
      }
    } catch {
      // fallback
    }

    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return { bestMoveUci: '', depth: 0, scoreCentipawns: 0 };
    const m = moves[0];
    return {
      bestMoveUci: `${m.from}${m.to}${m.promotion || ''}`,
      bestMoveSan: m.san,
      scoreCentipawns: 0,
      depth: 1,
    };
  }
}

export const stockfishEngine = new StockfishEngineService();
