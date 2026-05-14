import { Suspense } from 'react';
import GameScreen from '@/components/game/GameScreen';
import { GameProvider } from '@/context/GameContext';

export default function GamePage() {
  return (
    <GameProvider>
      <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><span className="text-2xl font-fredoka text-primary animate-pulse">Loading…</span></div>}>
        <GameScreen />
      </Suspense>
    </GameProvider>
  );
}
