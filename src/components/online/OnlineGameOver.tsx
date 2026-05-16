'use client';

import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { OnlineRole } from '@/hooks/useOnlineGame';

interface OnlineGameOverProps {
  isOpen: boolean;
  result: string | null;
  role: OnlineRole | null;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export default function OnlineGameOver({ isOpen, result, role, onPlayAgain, onGoHome }: OnlineGameOverProps) {
  const firedRef = useRef(false);

  const isWin =
    (role === 'white' && result === 'white_wins') ||
    (role === 'black' && result === 'black_wins');
  const isDraw = result === 'draw';

  useEffect(() => {
    if (!isOpen || firedRef.current) return;
    firedRef.current = true;
    if (isWin) {
      setTimeout(() => confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } }), 200);
    }
  }, [isOpen, isWin]);

  useEffect(() => {
    if (!isOpen) firedRef.current = false;
  }, [isOpen]);

  const headline = isDraw
    ? "🤝 It's a Draw!"
    : isWin
    ? '🎉 You Won!'
    : '😔 You Lost';

  const sub = isDraw
    ? 'Great game from both sides!'
    : isWin
    ? 'Amazing — you beat your friend!'
    : 'Better luck next time!';

  return (
    <Modal isOpen={isOpen} className="w-full max-w-sm p-6">
      <div className="text-center space-y-4">
        <div className="text-5xl">{isDraw ? '🤝' : isWin ? '🏆' : '😔'}</div>
        <h2 className="text-2xl font-fredoka text-gray-800">{headline}</h2>
        <p className="text-sm text-gray-500">{sub}</p>
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" size="md" onClick={onGoHome} className="flex-1" aria-label="Go home">
            🏠 Home
          </Button>
          <Button variant="primary" size="md" onClick={onPlayAgain} className="flex-1" aria-label="Play again">
            🔁 Rematch
          </Button>
        </div>
      </div>
    </Modal>
  );
}
