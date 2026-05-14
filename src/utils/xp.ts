import type { Difficulty } from '@/context/GameContext';

export const calculateXP = ({
  result,
  mode,
  difficulty,
  hintsUsed,
  undosUsed,
}: {
  result: 'win' | 'loss' | 'draw';
  mode: 'computer' | 'friend';
  difficulty: Difficulty;
  hintsUsed: number;
  undosUsed: number;
}): number => {
  if (result !== 'win') return 5;
  const base = mode === 'computer' ? ([30, 50, 80] as const)[difficulty - 1] : 25;
  return Math.max(10, base - hintsUsed * 3 - undosUsed * 2);
};
