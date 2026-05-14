'use client';

import React, { useEffect, useState } from 'react';
import { getXPProgress, getRank, getNextRank } from '@/utils/ranks';

interface XPBarProps {
  xp: number;
  showLabel?: boolean;
}

export default function XPBar({ xp, showLabel = true }: XPBarProps) {
  const { current, needed, percent } = getXPProgress(xp);
  const rank = getRank(xp);
  const next = getNextRank(xp);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDisplayPercent(percent), 50);
    return () => clearTimeout(t);
  }, [percent]);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1 font-nunito">
          <span style={{ color: rank.color }}>{rank.icon} {rank.name}</span>
          {next ? <span>{current} / {needed} XP</span> : <span className="text-yellow-600">Max Rank! 🏆</span>}
        </div>
      )}
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full xp-bar-fill" style={{ width: `${displayPercent}%`, backgroundColor: rank.color }} />
      </div>
    </div>
  );
}
