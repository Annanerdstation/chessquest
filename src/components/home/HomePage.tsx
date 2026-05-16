'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import RankBadge from '@/components/progression/RankBadge';
import XPBar from '@/components/progression/XPBar';
import DifficultyPicker from './DifficultyPicker';
import { usePlayer } from '@/context/PlayerContext';
import { useGame } from '@/context/GameContext';
import type { Difficulty } from '@/context/GameContext';

export default function HomePage() {
  const { player, setName } = usePlayer();
  const { startGame } = useGame();
  const router = useRouter();

  const [nameInput, setNameInput] = useState('');
  const [showDifficulty, setShowDifficulty] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const hasName = player.name.trim().length > 0;

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed) setName(trimmed);
  };

  const handlePlayComputer = () => {
    setShowDifficulty(true);
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setShowDifficulty(false);
    startGame('computer', difficulty);
    router.push('/game?mode=computer');
  };

  const handlePlayFriend = () => {
    startGame('friend', 1);
    router.push('/game?mode=friend');
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 page-fade">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">♚</div>
        <h1 className="text-5xl font-fredoka text-primary tracking-tight">ChessQuest</h1>
        <p className="text-gray-500 mt-2 font-nunito">Your chess adventure begins here!</p>
      </div>

      {/* Name entry / welcome */}
      {!hasName ? (
        <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-sm mb-6">
          <p className="text-center font-semibold text-gray-700 mb-4">What&apos;s your name, adventurer?</p>
          <form onSubmit={handleSetName} className="flex flex-col gap-3">
            <input
              ref={nameRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name…"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none font-nunito text-gray-800"
              aria-label="Player name"
              autoFocus
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!nameInput.trim()}
              className="w-full"
              aria-label="Let's play!"
            >
              🎮 Let&apos;s Play!
            </Button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md p-4 w-full max-w-sm mb-6 flex items-center gap-4">
          <div className="text-3xl">👤</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">Welcome back, {player.name}!</p>
            <div className="mt-1">
              <RankBadge xp={player.xp} size="sm" />
            </div>
          </div>
          <div className="w-24">
            <XPBar xp={player.xp} showLabel={false} />
          </div>
        </div>
      )}

      {/* Play buttons */}
      {hasName && (
        <div className="w-full max-w-sm space-y-3">
          <Button
            variant="primary"
            size="lg"
            onClick={handlePlayComputer}
            className="w-full"
            aria-label="Play vs Computer"
          >
            ⚔️ Play Computer
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handlePlayFriend}
            className="w-full"
            aria-label="Play vs Friend (same device)"
          >
            👥 Play Friend
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/online')}
            className="w-full !bg-blue-500 hover:!bg-blue-600"
            aria-label="Play online with a friend on another device"
          >
            🌐 Play Online
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => router.push('/profile')}
            className="w-full"
            aria-label="View profile"
          >
            👤 Profile
          </Button>
        </div>
      )}

      {/* Difficulty picker modal */}
      <DifficultyPicker
        isOpen={showDifficulty}
        onSelect={handleDifficultySelect}
        onClose={() => setShowDifficulty(false)}
      />
    </div>
  );
}
