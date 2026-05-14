'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'chessquest_player';

export interface PlayerState {
  name: string;
  xp: number;
  gamesPlayed: number;
  gamesWon: number;
}

const defaultState: PlayerState = {
  name: '',
  xp: 0,
  gamesPlayed: 0,
  gamesWon: 0,
};

type PlayerAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'ADD_XP'; amount: number }
  | { type: 'RECORD_GAME'; won: boolean }
  | { type: 'RESET' }
  | { type: 'LOAD'; state: PlayerState };

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.name };
    case 'ADD_XP':
      return { ...state, xp: state.xp + action.amount };
    case 'RECORD_GAME':
      return {
        ...state,
        gamesPlayed: state.gamesPlayed + 1,
        gamesWon: action.won ? state.gamesWon + 1 : state.gamesWon,
      };
    case 'RESET':
      return defaultState;
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}

interface PlayerContextValue {
  player: PlayerState;
  setName: (name: string) => void;
  addXP: (amount: number) => void;
  recordGame: (won: boolean) => void;
  reset: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [player, dispatch] = useReducer(playerReducer, defaultState);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as PlayerState;
        dispatch({ type: 'LOAD', state: { ...defaultState, ...saved } });
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  }, [player]);

  const setName = useCallback((name: string) => dispatch({ type: 'SET_NAME', name }), []);
  const addXP = useCallback((amount: number) => dispatch({ type: 'ADD_XP', amount }), []);
  const recordGame = useCallback((won: boolean) => dispatch({ type: 'RECORD_GAME', won }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <PlayerContext.Provider value={{ player, setName, addXP, recordGame, reset }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
