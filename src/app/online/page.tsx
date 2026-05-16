import { Suspense } from 'react';
import OnlineGameScreen from '@/components/online/OnlineGameScreen';
import { GameProvider } from '@/context/GameContext';

export default function OnlinePage() {
  return (
    <GameProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <span className="text-2xl font-fredoka text-primary animate-pulse">Loading…</span>
        </div>
      }>
        <OnlineGameScreen />
      </Suspense>
    </GameProvider>
  );
}
