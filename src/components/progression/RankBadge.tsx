'use client';

import React from 'react';
import { getRank } from '@/utils/ranks';

interface RankBadgeProps {
  xp: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'text-lg px-3 py-1 gap-1', md: 'text-2xl px-4 py-2 gap-2', lg: 'text-3xl px-5 py-3 gap-2' };
const textSizeClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

export default function RankBadge({ xp, size = 'md' }: RankBadgeProps) {
  const rank = getRank(xp);
  return (
    <div
      className={`inline-flex items-center rounded-2xl font-semibold font-nunito ${sizeClasses[size]}`}
      style={{ backgroundColor: rank.color + '20', border: `2px solid ${rank.color}40` }}
    >
      <span>{rank.icon}</span>
      <span className={`${textSizeClasses[size]} font-bold`} style={{ color: rank.color }}>{rank.name}</span>
    </div>
  );
}
