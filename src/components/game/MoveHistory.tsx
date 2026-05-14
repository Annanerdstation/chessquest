'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Move } from 'chess.js';

interface MoveHistoryProps {
  history: Move[];
  collapsed?: boolean;
}

export default function MoveHistory({ history, collapsed = false }: MoveHistoryProps) {
  const [isOpen, setIsOpen] = useState(!collapsed);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isOpen]);

  // Pair moves into rows
  const pairs: Array<{ white?: string; black?: string }> = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({ white: history[i]?.san, black: history[i + 1]?.san });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <button
        className="w-full flex items-center justify-between px-4 py-3 font-semibold text-sm text-gray-700 hover:bg-gray-50 rounded-2xl transition-colors"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-label="Toggle move history"
      >
        <span>📋 Move History</span>
        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'} {history.length} moves</span>
      </button>

      {isOpen && (
        <div
          ref={scrollRef}
          className="max-h-48 overflow-y-auto scrollbar-thin px-4 pb-3"
        >
          {pairs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No moves yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-1 w-8">#</th>
                  <th className="text-left pb-1">White</th>
                  <th className="text-left pb-1">Black</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    <td className="py-0.5 text-gray-400 text-xs w-8">{i + 1}.</td>
                    <td className="py-0.5 font-mono font-medium text-gray-800">{pair.white}</td>
                    <td className="py-0.5 font-mono text-gray-600">{pair.black ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
