'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import RankBadge from '@/components/progression/RankBadge';
import XPBar from '@/components/progression/XPBar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { getRank, getNextRank, getXPProgress, RANKS } from '@/utils/ranks';

export default function ProfileScreen() {
  const { player, setName, reset } = usePlayer();
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(player.name);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const rank = getRank(player.xp);
  const next = getNextRank(player.xp);
  const { current: xpInRank, needed } = getXPProgress(player.xp);
  const winRate = player.gamesPlayed > 0
    ? Math.round((player.gamesWon / player.gamesPlayed) * 100)
    : 0;

  const handleNameSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed) setName(trimmed);
    setEditingName(false);
  };

  const handleReset = () => {
    reset();
    setShowResetConfirm(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-bg page-fade">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white shadow-sm border-b border-gray-100">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')} aria-label="Go home">
          ← Home
        </Button>
        <div className="font-fredoka text-xl text-primary">Profile</div>
        <div className="w-20" />
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Player card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
              {rank.icon}
            </div>
            <div className="flex-1">
              {editingName ? (
                <form onSubmit={handleNameSave} className="flex gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={20}
                    autoFocus
                    className="flex-1 px-3 py-1.5 rounded-xl border-2 border-primary focus:outline-none text-sm font-nunito"
                    aria-label="Edit player name"
                  />
                  <button type="submit" className="text-primary font-semibold text-sm hover:opacity-70">Save</button>
                  <button type="button" onClick={() => setEditingName(false)} className="text-gray-400 text-sm hover:opacity-70">✕</button>
                </form>
              ) : (
                <button
                  onClick={() => { setNameInput(player.name); setEditingName(true); }}
                  className="text-left group"
                  aria-label="Edit name"
                >
                  <p className="font-bold text-gray-800 text-lg group-hover:text-primary transition-colors">
                    {player.name || 'Anonymous'}
                  </p>
                  <p className="text-xs text-gray-400 group-hover:text-primary/60 transition-colors">tap to edit name ✏️</p>
                </button>
              )}
            </div>
          </div>
          <RankBadge xp={player.xp} size="md" />
        </div>

        {/* XP Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">XP Progress</h2>
          <XPBar xp={player.xp} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{player.xp} total XP</span>
            {next ? (
              <span>{xpInRank} / {needed} to {next.name}</span>
            ) : (
              <span>Max rank reached! 🏆</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Statistics</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-primary/5 rounded-xl p-3">
              <p className="text-2xl font-fredoka text-primary">{player.gamesPlayed}</p>
              <p className="text-xs text-gray-500 mt-0.5">Games</p>
            </div>
            <div className="bg-win/10 rounded-xl p-3">
              <p className="text-2xl font-fredoka text-win">{player.gamesWon}</p>
              <p className="text-xs text-gray-500 mt-0.5">Wins</p>
            </div>
            <div className="bg-accent/10 rounded-xl p-3">
              <p className="text-2xl font-fredoka text-accent">{winRate}%</p>
              <p className="text-xs text-gray-500 mt-0.5">Win Rate</p>
            </div>
          </div>
        </div>

        {/* Rank ladder */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Rank Ladder</h2>
          <div className="space-y-2">
            {[...RANKS].map((r) => {
              const isCurrentRank = r.name === rank.name;
              const unlocked = player.xp >= r.minXP;
              return (
                <div
                  key={r.name}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                    isCurrentRank ? 'ring-2' : ''
                  } ${unlocked ? 'opacity-100' : 'opacity-30'}`}
                  style={isCurrentRank ? { outline: `2px solid ${r.color}`, backgroundColor: r.color + '10' } : {}}
                >
                  <span className="text-xl">{r.icon}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-sm" style={{ color: r.color }}>{r.name}</span>
                    {isCurrentRank && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                  <span className="text-xs text-gray-400">{r.minXP} XP</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl shadow-sm border border-loss/20 p-5">
          <h2 className="font-semibold text-loss mb-3">Reset Progress</h2>
          <p className="text-sm text-gray-500 mb-3">This will erase all XP, stats, and your name.</p>
          <Button
            variant="danger"
            size="md"
            onClick={() => setShowResetConfirm(true)}
            className="w-full"
            aria-label="Reset all progress"
          >
            🗑️ Reset Everything
          </Button>
        </div>
      </div>

      {/* Reset confirmation */}
      <Modal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} className="p-6 w-80">
        <h3 className="text-xl font-fredoka text-center text-gray-800 mb-2">Are you sure?</h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          All your XP and progress will be deleted. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" size="md" onClick={() => setShowResetConfirm(false)} className="flex-1" aria-label="Cancel reset">
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={handleReset} className="flex-1" aria-label="Confirm reset">
            Yes, Reset
          </Button>
        </div>
      </Modal>
    </div>
  );
}
