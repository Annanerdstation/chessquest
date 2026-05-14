'use client';

import React from 'react';

const PIECE_ICONS: Record<string, string> = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
};
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

interface CapturedPiecesProps {
  capturedByWhite: string[];
  capturedByBlack: string[];
}

function materialScore(pieces: string[]): number {
  return pieces.reduce((sum, p) => sum + (PIECE_VALUES[p] ?? 0), 0);
}

export default function CapturedPieces({ capturedByWhite, capturedByBlack }: CapturedPiecesProps) {
  const whiteScore = materialScore(capturedByWhite);
  const blackScore = materialScore(capturedByBlack);
  const diff = whiteScore - blackScore;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap min-h-[24px]">
        <span className="text-xs font-semibold text-gray-500 w-12">White</span>
        <span className="flex flex-wrap gap-0.5">
          {capturedByWhite.sort().map((p, i) => (
            <span key={i} className="text-base leading-none opacity-80">{PIECE_ICONS[p]}</span>
          ))}
        </span>
        {diff > 0 && <span className="text-xs font-bold text-primary ml-1">+{diff}</span>}
      </div>
      <div className="flex items-center gap-2 flex-wrap min-h-[24px]">
        <span className="text-xs font-semibold text-gray-500 w-12">Black</span>
        <span className="flex flex-wrap gap-0.5">
          {capturedByBlack.sort().map((p, i) => (
            <span key={i} className="text-base leading-none">{PIECE_ICONS[p]}</span>
          ))}
        </span>
        {diff < 0 && <span className="text-xs font-bold text-gray-700 ml-1">+{Math.abs(diff)}</span>}
      </div>
    </div>
  );
}
