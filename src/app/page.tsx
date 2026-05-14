import HomePage from '@/components/home/HomePage';
import { GameProvider } from '@/context/GameContext';

export default function Home() {
  return (
    <GameProvider>
      <HomePage />
    </GameProvider>
  );
}
