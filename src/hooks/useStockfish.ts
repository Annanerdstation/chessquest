'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const isReadyRef = useRef(false);
  const pendingReadyRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const worker = new Worker('/stockfish.js');
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<string>) => {
        const data = typeof e.data === 'string' ? e.data : String(e.data);
        if (data === 'readyok') {
          isReadyRef.current = true;
          pendingReadyRef.current.forEach((fn) => fn());
          pendingReadyRef.current = [];
        }
      };

      worker.postMessage('uci');
      worker.postMessage('isready');
    } catch {
      // Stockfish unavailable — degrade gracefully
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const waitForReady = useCallback((): Promise<void> => {
    if (isReadyRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      pendingReadyRef.current.push(resolve);
      // Timeout fallback
      setTimeout(resolve, 5000);
    });
  }, []);

  const getBestMove = useCallback(
    async (fen: string, depth: number): Promise<{ from: string; to: string; promotion?: string }> => {
      const worker = workerRef.current;
      if (!worker) throw new Error('No Stockfish worker');

      await waitForReady();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.removeEventListener('message', handler);
          reject(new Error('Stockfish timeout'));
        }, 15000);

        const handler = (e: MessageEvent) => {
          const data = typeof e.data === 'string' ? e.data : String(e.data);
          if (data.startsWith('bestmove')) {
            clearTimeout(timeout);
            worker.removeEventListener('message', handler);
            const parts = data.split(' ');
            const moveStr = parts[1];
            if (!moveStr || moveStr === '(none)') {
              reject(new Error('No best move'));
              return;
            }
            resolve({
              from: moveStr.slice(0, 2),
              to: moveStr.slice(2, 4),
              promotion: moveStr.length === 5 ? moveStr[4] : undefined,
            });
          }
        };

        worker.addEventListener('message', handler);
        worker.postMessage('ucinewgame');
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth}`);
      });
    },
    [waitForReady]
  );

  return { getBestMove };
}
