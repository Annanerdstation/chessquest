'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';

interface PromotionDialogProps {
  isOpen: boolean;
  color: 'w' | 'b';
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

const PIECES: Array<{ key: 'q' | 'r' | 'b' | 'n'; label: string; white: string; black: string }> = [
  { key: 'q', label: 'Queen',  white: '♛', black: '♛' },
  { key: 'r', label: 'Rook',   white: '♜', black: '♜' },
  { key: 'b', label: 'Bishop', white: '♝', black: '♝' },
  { key: 'n', label: 'Knight', white: '♞', black: '♞' },
];

export default function PromotionDialog({ isOpen, color, onSelect, onCancel }: PromotionDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="p-6 w-80">
      <h3 className="text-xl font-fredoka text-gray-800 text-center mb-4">Promote Pawn!</h3>
      <div className="grid grid-cols-4 gap-3">
        {PIECES.map((p) => (
          <button
            key={p.key}
            onClick={() => onSelect(p.key)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-primary/5 transition-all hover:scale-105 active:scale-95"
            aria-label={`Promote to ${p.label}`}
          >
            <span className="text-3xl">{color === 'w' ? p.white : p.black}</span>
            <span className="text-xs font-semibold text-gray-600">{p.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
