'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { useGame as useGameContext } from '@/context/GameContext';
import { useStockfish } from './useStockfish';

// Difficulty config: [depth, skillLevel (0-20), randomMoveProbability]
// Beginner: mostly random moves — even a 6-year-old can win
// Explorer: occasionally random — feels beatable but plays real chess
// Champion: full Stockfish strength
const DIFFICULTY_CONFIG = {
  1: { depth: 2,  skillLevel: 2,  randomChance: 0.45 },
  2: { depth: 4,  skillLevel: 8,  randomChance: 0.20 },
  3: { depth: 10, skillLevel: 18, randomChance: 0.00 },
} as const;

function pickRandomMove(chess: Chess): { from: string; to: string; promotion?: string } | null {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  const move = moves[Math.floor(Math.random() * moves.length)];
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  };
}

export function useBoard() {
  const { gameState, applyMove, undoMove, setThinking, setGameOver, consumeUndo } = useGameContext();
  const { getBestMove } = useStockfish();
  const chessRef = useRef<Chess>(new Chess());

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);

  // Reset chess when a new game starts
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.history.length === 0) {
      chessRef.current = new Chess();
      setSelectedSquare(null);
      setLegalMoves([]);
      setLastMove(null);
      setCheckSquare(null);
      setPromotionPending(null);
    }
  }, [gameState.status, gameState.history.length]);

  const findCheckSquare = useCallback((chess: Chess): string | null => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          return `${String.fromCharCode(97 + c)}${8 - r}`;
        }
      }
    }
    return null;
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
  }, []);

  const checkGameOver = useCallback((chess: Chess) => {
    if (chess.isCheckmate()) {
      setGameOver({ outcome: 'checkmate', winner: chess.turn() === 'w' ? 'black' : 'white' });
    } else if (chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial() || chess.isDraw()) {
      setGameOver({ outcome: 'draw', winner: 'none' });
    }
  }, [setGameOver]);

  const makeAIMove = useCallback(async () => {
    const chess = chessRef.current;
    if (chess.isGameOver()) return;
    setThinking(true);
    try {
      const config = DIFFICULTY_CONFIG[gameState.difficulty];

      // Decide whether to play a random move (makes lower levels genuinely beatable)
      const playRandom = Math.random() < config.randomChance;

      let chosen: { from: string; to: string; promotion?: string } | null = null;

      if (playRandom) {
        chosen = pickRandomMove(chess);
      }

      // Fall back to Stockfish if random picker returned nothing or we're not going random
      if (!chosen) {
        chosen = await getBestMove(chess.fen(), config.depth, config.skillLevel);
      }

      const move = chess.move({ from: chosen.from, to: chosen.to, promotion: chosen.promotion || 'q' });
      if (move) {
        applyMove(move, chess);
        setLastMove({ from: move.from, to: move.to });
        setCheckSquare(findCheckSquare(chess));
        checkGameOver(chess);
      }
    } catch {
      // AI failed — try a random legal move as last resort
      const fallback = pickRandomMove(chessRef.current);
      if (fallback) {
        const move = chessRef.current.move({ from: fallback.from, to: fallback.to, promotion: fallback.promotion || 'q' });
        if (move) {
          applyMove(move, chessRef.current);
          setLastMove({ from: move.from, to: move.to });
          setCheckSquare(findCheckSquare(chessRef.current));
          checkGameOver(chessRef.current);
        }
      }
    } finally {
      setThinking(false);
    }
  }, [gameState.difficulty, getBestMove, applyMove, setThinking, findCheckSquare, checkGameOver]);

  const tryMove = useCallback(async (from: string, to: string, promotion?: string) => {
    const chess = chessRef.current;
    const piece = chess.get(from as Parameters<Chess['get']>[0]);
    const isPromo =
      piece?.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromo && !promotion) {
      setPromotionPending({ from, to });
      return;
    }

    const move = chess.move({ from, to, promotion: promotion || 'q' }) as Move | null;
    if (!move) {
      triggerShake();
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    applyMove(move, chess);
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove({ from: move.from, to: move.to });
    setCheckSquare(findCheckSquare(chess));
    checkGameOver(chess);

    if (gameState.mode === 'computer' && chess.turn() === 'b' && !chess.isGameOver()) {
      await makeAIMove();
    }
  }, [applyMove, triggerShake, findCheckSquare, checkGameOver, gameState.mode, makeAIMove]);

  const handleSquareClick = useCallback((square: string) => {
    const chess = chessRef.current;
    if (gameState.status !== 'playing' || gameState.isThinking) return;
    if (gameState.mode === 'computer' && chess.turn() === 'b') return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      if (legalMoves.includes(square)) {
        tryMove(selectedSquare, square);
        return;
      }
    }

    const piece = chess.get(square as Parameters<Chess['get']>[0]);
    if (!piece || piece.color !== chess.turn()) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const moves = chess.moves({ square: square as Parameters<Chess['moves']>[0]['square'], verbose: true });
    setSelectedSquare(square);
    setLegalMoves(moves.map((m) => m.to));
  }, [gameState, selectedSquare, legalMoves, tryMove]);

  const handlePieceDrop = useCallback((from: string, to: string): boolean => {
    const chess = chessRef.current;
    if (gameState.status !== 'playing' || gameState.isThinking) return false;
    if (gameState.mode === 'computer' && chess.turn() === 'b') return false;

    const piece = chess.get(from as Parameters<Chess['get']>[0]);
    const isPromo =
      piece?.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromo) {
      setPromotionPending({ from, to });
      return true;
    }

    const move = chess.move({ from, to }) as Move | null;
    if (!move) {
      triggerShake();
      return false;
    }

    applyMove(move, chess);
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove({ from: move.from, to: move.to });
    setCheckSquare(findCheckSquare(chess));
    checkGameOver(chess);

    if (gameState.mode === 'computer' && chess.turn() === 'b' && !chess.isGameOver()) {
      makeAIMove();
    }
    return true;
  }, [gameState, applyMove, triggerShake, findCheckSquare, checkGameOver, makeAIMove]);

  const confirmPromotion = useCallback((piece: 'q' | 'r' | 'b' | 'n') => {
    if (!promotionPending) return;
    const pending = promotionPending;
    setPromotionPending(null);
    tryMove(pending.from, pending.to, piece);
  }, [promotionPending, tryMove]);

  const cancelPromotion = useCallback(() => {
    setPromotionPending(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (gameState.undosRemaining <= 0 || gameState.isThinking || gameState.status !== 'playing') return;
    const chess = chessRef.current;
    const steps = gameState.mode === 'computer' ? 2 : 1;
    for (let i = 0; i < steps; i++) chess.undo();
    consumeUndo();
    undoMove(chess, steps);
    setSelectedSquare(null);
    setLegalMoves([]);
    const hist = chess.history({ verbose: true });
    const last = hist[hist.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
    setCheckSquare(findCheckSquare(chess));
  }, [gameState, consumeUndo, undoMove, findCheckSquare]);

  return {
    chess: chessRef,
    selectedSquare,
    legalMoves,
    lastMove,
    checkSquare,
    isShaking,
    handleSquareClick,
    handlePieceDrop,
    promotionPending,
    confirmPromotion,
    cancelPromotion,
    handleUndo,
  };
}
