'use client';

import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import XPBar from '@/components/progression/XPBar';
import RankBadge from '@/components/progression/RankBadge';
import { useGame } from '@/context/GameContext';
import { usePlayer } from '@/context/PlayerContext';
import { calculateXP } from '@/utils/xp';
import { getRank } from '@/utils/ranks';
import { useRouter } from 'next/navigation';

interface GameOverModalProps {
  isOpen: boolean;
  onPlayAgain: () => void;
}

export default function GameOverModal({ isOpen, onPlayAgain }: GameOverModalProps) {
  const { gameState, resetGame } = useGame();
  const { player, addXP, recordGame } = usePlayer();
  const router = useRouter();
  const xpAwardedRef = useRef(false);

  const { result, mode, difficulty, hintsUsed, undosUsed } = gameState;

  const isWin =
    result?.outcome === 'checkmate' &&
    ((mode === 'computer' && result.winner === 'white') ||
      (mode === 'friend' && result.winner !== 'none'));

  const isLoss = result?.outcome !== 'stalemate' && !isWin && result?.outcome !== 'draw';

  const outcomeKey: 'win' | 'loss' | 'draw' =
    result?.outcome === 'stalemate' || result?.outcome === 'draw'
      ? 'draw'
      : isWin
      ? 'win'
      : 'loss';

  const xpEarned = calculateXP({
    result: outcomeKey,
    mode,
    difficulty,
    hintsUsed,
    undosUsed,
  });

  const oldXP = useRef(player.xp);
  const oldRank = useRef(getRank(player.xp));

  useEffect(() => {
    if (!isOpen || xpAwardedRef.current) return;
    xpAwardedRef.current = true;

    oldXP.current = player.xp;
    oldRank.current = getRank(player.xp);

    addXP(xpEarned);
    recordGame(isWin);

    if (isWin) {
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#2D6A4F', '#F4A261', '#52B788', '#FFD166'],
        });
      }, 200);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const newXP = player.xp;
  const newRank = getRank(newXP);
  const didRankUp = newRank.name !== oldRank.current.name;

  const resultText =
    outcomeKey === 'win'
      ? mode === 'computer'
        ? '🎉 You beat the computer!'
        : '🎉 Checkmate!'
      : outcomeKey === 'draw'
      ? "🤝 It's a draw!"
      : result?.outcome === 'resign'
      ? '🏳️ You resigned'
      : '♟ Better luck next time!';

  const handleGoHome = () => {
    resetGame();
    router.push('/');
  };

  const handlePlayAgain = () => {
    xpAwardedRef.current = false;
    onPlayAgain();
  };

  return (
    <Modal isOpen={isOpen} className="w-full max-w-sm p-6">
      <div className="text-center space-y-4">
        {/* Result heading */}
        <h2 className="text-2xl font-fredoka text-gray-800">{resultText}</h2>

        {/* Rank-up celebration */}
        {didRankUp && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
            <p className="text-sm font-semibold text-yellow-700 mb-1">🏆 Rank Up!</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg opacity-60">{oldRank.current.icon}</span>
              <span className="text-gray-400">→</span>
              <RankBadge xp={newXP} size="md" />
            </div>
          </div>
        )}

        {/* XP earned */}
        <div className="bg-primary/5 rounded-2xl p-3">
          <p className="text-sm text-gray-500 mb-1">XP Earned</p>
          <p className="text-3xl font-fredoka text-primary">+{xpEarned}</p>
        </div>

        {/* XP bar */}
        <XPBar xp={newXP} />

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" size="md" onClick={handleGoHome} className="flex-1" aria-label="Go home">
            🏠 Home
          </Button>
          <Button variant="primary" size="md" onClick={handlePlayAgain} className="flex-1" aria-label="Play again">
            ⚔️ Again
          </Button>
        </div>
      </div>
    </Modal>
  );
}
