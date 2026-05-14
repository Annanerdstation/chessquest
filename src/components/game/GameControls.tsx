'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { useGame } from '@/context/GameContext';

interface GameControlsProps {
  onHint: () => void;
  onUndo: () => void;
  onResign: () => void;
  onThemeToggle: () => void;
  isPlayerTurn: boolean;
}

export default function GameControls({
  onHint,
  onUndo,
  onResign,
  onThemeToggle,
  isPlayerTurn,
}: GameControlsProps) {
  const { gameState } = useGame();
  const { hintsRemaining, undosRemaining, isThinking, difficulty, mode } = gameState;

  const canHint = isPlayerTurn && !isThinking && hintsRemaining > 0;
  const canUndo = isPlayerTurn && !isThinking && undosRemaining > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">Controls</span>
        <button
          onClick={onThemeToggle}
          className="text-lg hover:scale-110 transition-transform"
          aria-label="Toggle board theme"
          title="Toggle board theme"
        >
          🎨
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {mode === 'computer' && difficulty < 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onHint}
            disabled={!canHint}
            aria-label={`Hint — ${hintsRemaining} remaining`}
            className="justify-start"
          >
            <span className="flex gap-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={i < hintsRemaining ? 'opacity-100' : 'opacity-20'}>💡</span>
              ))}
            </span>
            <span>Hint</span>
          </Button>
        )}

        {(mode === 'friend' || (mode === 'computer' && difficulty < 3)) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={`Undo — ${undosRemaining} remaining`}
            className="justify-start"
          >
            <span className="flex gap-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={i < undosRemaining ? 'opacity-100' : 'opacity-20'}>↩️</span>
              ))}
            </span>
            <span>Undo</span>
          </Button>
        )}

        <Button
          variant="danger"
          size="sm"
          onClick={onResign}
          disabled={isThinking}
          aria-label="Resign game"
          className="justify-start"
        >
          🏳️ Resign
        </Button>
      </div>
    </div>
  );
}
