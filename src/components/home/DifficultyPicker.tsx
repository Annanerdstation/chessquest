'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { Difficulty } from '@/context/GameContext';

interface DifficultyPickerProps {
  isOpen: boolean;
  onSelect: (difficulty: Difficulty) => void;
  onClose: () => void;
}

const LEVELS: Array<{
  difficulty: Difficulty;
  label: string;
  emoji: string;
  depth: number;
  undos: number;
  hints: number;
  color: string;
  desc: string;
}> = [
  {
    difficulty: 1,
    label: 'Beginner',
    emoji: '🟢',
    depth: 1,
    undos: 3,
    hints: 3,
    color: 'border-green-400 hover:bg-green-50',
    desc: 'Easy AI · 3 hints · 3 undos',
  },
  {
    difficulty: 2,
    label: 'Explorer',
    emoji: '🟡',
    depth: 4,
    undos: 1,
    hints: 1,
    color: 'border-yellow-400 hover:bg-yellow-50',
    desc: 'Medium AI · 1 hint · 1 undo',
  },
  {
    difficulty: 3,
    label: 'Champion',
    emoji: '🔴',
    depth: 8,
    undos: 0,
    hints: 0,
    color: 'border-red-400 hover:bg-red-50',
    desc: 'Hard AI · No hints · No undos',
  },
];

export default function DifficultyPicker({ isOpen, onSelect, onClose }: DifficultyPickerProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-6 w-full max-w-sm">
      <h2 className="text-2xl font-fredoka text-gray-800 text-center mb-5">Choose Difficulty</h2>
      <div className="space-y-3">
        {LEVELS.map((level) => (
          <button
            key={level.difficulty}
            onClick={() => onSelect(level.difficulty)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${level.color}`}
            aria-label={`${level.label} difficulty`}
          >
            <span className="text-2xl">{level.emoji}</span>
            <div className="text-left">
              <div className="font-bold text-gray-800 font-nunito">{level.label}</div>
              <div className="text-xs text-gray-500">{level.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onClose} className="w-full mt-4" aria-label="Cancel">
        Cancel
      </Button>
    </Modal>
  );
}
