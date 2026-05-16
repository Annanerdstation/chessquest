'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface OnlineLobbyProps {
  onCreateGame: () => void;
  onJoinGame: (code: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function OnlineLobby({ onCreateGame, onJoinGame, isLoading, error }: OnlineLobbyProps) {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) onJoinGame(code.trim());
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 page-fade">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🌐</div>
        <h1 className="text-4xl font-fredoka text-primary">Play Online</h1>
        <p className="text-gray-500 mt-2 font-nunito">Challenge a friend from anywhere!</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Create game */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-fredoka text-xl text-gray-800 mb-1">Start a new game</h2>
          <p className="text-sm text-gray-500 mb-4">Get a code to share with your friend</p>
          <Button
            variant="primary"
            size="lg"
            onClick={onCreateGame}
            disabled={isLoading}
            className="w-full"
            aria-label="Create online game"
          >
            {isLoading ? '⏳ Creating…' : '⚔️ Create Game'}
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-semibold">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Join game */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-fredoka text-xl text-gray-800 mb-1">Join a game</h2>
          <p className="text-sm text-gray-500 mb-4">Enter the code your friend sent you</p>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none font-mono text-xl uppercase tracking-widest text-center"
              aria-label="Game code"
            />
            <Button
              type="submit"
              variant="secondary"
              size="md"
              disabled={code.length !== 6 || isLoading}
              aria-label="Join game"
            >
              Join
            </Button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-loss/10 border border-loss/30 rounded-2xl px-4 py-3 text-sm text-loss font-semibold text-center">
            {error}
          </div>
        )}

        <Button variant="ghost" size="md" onClick={() => router.push('/')} className="w-full" aria-label="Go home">
          ← Back to Home
        </Button>
      </div>
    </div>
  );
}
