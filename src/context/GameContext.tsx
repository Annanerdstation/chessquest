'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';

export type GameMode = 'computer' | 'friend';
export type Difficulty = 1 | 2 | 3;
export type GameStatus = 'idle' | 'playing' | 'over';

export interface GameResult {
  outcome: 'checkmate' | 'stalemate' | 'draw' | 'resign';
  winner: 'white' | 'black' | 'none';
}

export interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  status: GameStatus;
  fen: string;
  history: Move[];
  capturedByWhite: string[];
  capturedByBlack: string[];
  hintsRemaining: number;
  undosRemaining: number;
  hintsUsed: number;
  undosUsed: number;
  isThinking: boolean;
  result: GameResult | null;
  theme: 'classic' | 'ice';
}

const HINTS_BY_DIFFICULTY: Record<Difficulty, number> = { 1: 3, 2: 1, 3: 0 };
const UNDOS_BY_DIFFICULTY: Record<Difficulty, number> = { 1: 3, 2: 1, 3: 0 };
const THEME_KEY = 'chessquest_theme';

function loadTheme(): 'classic' | 'ice' {
  if (typeof window === 'undefined') return 'classic';
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'ice' ? 'ice' : 'classic';
}

const initialChess = new Chess();

const defaultState: GameState = {
  mode: 'computer',
  difficulty: 1,
  status: 'idle',
  fen: initialChess.fen(),
  history: [],
  capturedByWhite: [],
  capturedByBlack: [],
  hintsRemaining: 3,
  undosRemaining: 3,
  hintsUsed: 0,
  undosUsed: 0,
  isThinking: false,
  result: null,
  theme: 'classic',
};

type GameAction =
  | { type: 'START_GAME'; mode: GameMode; difficulty: Difficulty }
  | { type: 'APPLY_MOVE'; move: Move; chess: Chess }
  | { type: 'UNDO_MOVE'; chess: Chess; steps: number }
  | { type: 'SET_THINKING'; thinking: boolean }
  | { type: 'GAME_OVER'; result: GameResult }
  | { type: 'USE_HINT' }
  | { type: 'USE_UNDO' }
  | { type: 'SET_THEME'; theme: 'classic' | 'ice' }
  | { type: 'RESET' };

function buildCaptured(history: Move[]) {
  const byWhite: string[] = [];
  const byBlack: string[] = [];
  for (const move of history) {
    if (move.captured) {
      if (move.color === 'w') byWhite.push(move.captured);
      else byBlack.push(move.captured);
    }
  }
  return { byWhite, byBlack };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const chess = new Chess();
      return {
        ...defaultState,
        mode: action.mode,
        difficulty: action.difficulty,
        status: 'playing',
        fen: chess.fen(),
        hintsRemaining: HINTS_BY_DIFFICULTY[action.difficulty],
        undosRemaining: UNDOS_BY_DIFFICULTY[action.difficulty],
        theme: state.theme,
      };
    }
    case 'APPLY_MOVE': {
      const history = action.chess.history({ verbose: true });
      const { byWhite, byBlack } = buildCaptured(history);
      return { ...state, fen: action.chess.fen(), history, capturedByWhite: byWhite, capturedByBlack: byBlack };
    }
    case 'UNDO_MOVE': {
      const history = action.chess.history({ verbose: true });
      const { byWhite, byBlack } = buildCaptured(history);
      return { ...state, fen: action.chess.fen(), history, capturedByWhite: byWhite, capturedByBlack: byBlack };
    }
    case 'SET_THINKING':
      return { ...state, isThinking: action.thinking };
    case 'GAME_OVER':
      return { ...state, status: 'over', result: action.result };
    case 'USE_HINT':
      return { ...state, hintsRemaining: Math.max(0, state.hintsRemaining - 1), hintsUsed: state.hintsUsed + 1 };
    case 'USE_UNDO':
      return { ...state, undosRemaining: Math.max(0, state.undosRemaining - 1), undosUsed: state.undosUsed + 1 };
    case 'SET_THEME': {
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_KEY, action.theme);
        document.documentElement.setAttribute('data-theme', action.theme === 'ice' ? 'ice' : '');
      }
      return { ...state, theme: action.theme };
    }
    case 'RESET':
      return { ...defaultState, theme: state.theme };
    default:
      return state;
  }
}

interface GameContextValue {
  gameState: GameState;
  startGame: (mode: GameMode, difficulty: Difficulty) => void;
  applyMove: (move: Move, chess: Chess) => void;
  undoMove: (chess: Chess, steps: number) => void;
  setThinking: (thinking: boolean) => void;
  setGameOver: (result: GameResult) => void;
  consumeHint: () => void;
  consumeUndo: () => void;
  setTheme: (theme: 'classic' | 'ice') => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, dispatch] = useReducer(gameReducer, { ...defaultState, theme: loadTheme() });

  const startGame = useCallback((mode: GameMode, difficulty: Difficulty) =>
    dispatch({ type: 'START_GAME', mode, difficulty }), []);
  const applyMove = useCallback((move: Move, chess: Chess) =>
    dispatch({ type: 'APPLY_MOVE', move, chess }), []);
  const undoMove = useCallback((chess: Chess, steps: number) =>
    dispatch({ type: 'UNDO_MOVE', chess, steps }), []);
  const setThinking = useCallback((thinking: boolean) =>
    dispatch({ type: 'SET_THINKING', thinking }), []);
  const setGameOver = useCallback((result: GameResult) =>
    dispatch({ type: 'GAME_OVER', result }), []);
  const consumeHint = useCallback(() => dispatch({ type: 'USE_HINT' }), []);
  const consumeUndo = useCallback(() => dispatch({ type: 'USE_UNDO' }), []);
  const setTheme = useCallback((theme: 'classic' | 'ice') =>
    dispatch({ type: 'SET_THEME', theme }), []);
  const resetGame = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <GameContext.Provider value={{ gameState, startGame, applyMove, undoMove, setThinking, setGameOver, consumeHint, consumeUndo, setTheme, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
