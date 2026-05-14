'use client';

import { useState, useCallback } from 'react';
import { useStockfish } from './useStockfish';
import { useGame } from '@/context/GameContext';

interface HintSquares {
  from: string | null;
  to: string | null;
}

export function useHints() {
  const { gameState, consumeHint } = useGame();
  const { getBestMove } = useStockfish();
  const [hintSquares, setHintSquares] = useState<HintSquares>({ from: null, to: null });

  const clearHint = useCallback(() => {
    setHintSquares({ from: null, to: null });
  }, []);

  const requestHint = useCallback(async (fen: string) => {
    if (gameState.hintsRemaining <= 0) return;
    consumeHint();

    try {
      const { from, to } = await getBestMove(fen, 10);
      setHintSquares({ from, to: null });

      setTimeout(() => {
        setHintSquares({ from, to });
      }, 2000);

      setTimeout(() => {
        setHintSquares({ from: null, to: null });
      }, 6000);
    } catch {
      // Stockfish unavailable — hint silently fails
    }
  }, [gameState.hintsRemaining, consumeHint, getBestMove]);

  return { hintSquares, requestHint, clearHint };
}
