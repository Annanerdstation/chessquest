export const RANKS = [
  { name: 'Pawn',   minXP: 0,    icon: '♟', color: '#8B7355' },
  { name: 'Knight', minXP: 200,  icon: '♞', color: '#6B7280' },
  { name: 'Bishop', minXP: 500,  icon: '♝', color: '#7C3AED' },
  { name: 'Rook',   minXP: 1000, icon: '♜', color: '#1D4ED8' },
  { name: 'Queen',  minXP: 2000, icon: '♛', color: '#B45309' },
  { name: 'King',   minXP: 4000, icon: '♚', color: '#DC2626' },
] as const;

export type RankName = typeof RANKS[number]['name'];

export interface Rank {
  name: RankName;
  minXP: number;
  icon: string;
  color: string;
}

export const getRank = (xp: number): Rank =>
  ([...RANKS].reverse().find((r) => xp >= r.minXP))!;

export const getNextRank = (xp: number): Rank | null => {
  const idx = RANKS.findIndex((r) => r.minXP > xp);
  return idx === -1 ? null : RANKS[idx];
};

export const getXPProgress = (xp: number): { current: number; needed: number; percent: number } => {
  const current = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return { current: xp - current.minXP, needed: 0, percent: 100 };
  const earned = xp - current.minXP;
  const needed = next.minXP - current.minXP;
  return { current: earned, needed, percent: Math.round((earned / needed) * 100) };
};
