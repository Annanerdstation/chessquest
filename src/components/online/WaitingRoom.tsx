'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

interface WaitingRoomProps {
  code: string;
  onCancel: () => void;
}

export default function WaitingRoom({ code, onCancel }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select text
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 page-fade">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3 animate-bounce">⏳</div>
        <h1 className="text-3xl font-fredoka text-primary">Waiting for friend…</h1>
        <p className="text-gray-500 mt-2">Share this code with the player you want to challenge</p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
        <p className="text-sm font-semibold text-gray-500 mb-3">Your Game Code</p>
        <div className="text-5xl font-fredoka tracking-widest text-primary mb-4 select-all">
          {code}
        </div>
        <Button
          variant={copied ? 'primary' : 'secondary'}
          size="md"
          onClick={handleCopy}
          className="w-full mb-3"
          aria-label="Copy game code"
        >
          {copied ? '✓ Copied!' : '📋 Copy Code'}
        </Button>
        <p className="text-xs text-gray-400 mt-2">You play as ⬜ White</p>
      </div>

      <Button variant="ghost" size="md" onClick={onCancel} className="mt-6" aria-label="Cancel game">
        Cancel
      </Button>
    </div>
  );
}
