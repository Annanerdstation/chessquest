'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { useGame as useGameContext } from '@/context/GameContext';
import { useStockfish } from './useStockfish';

const DEPTH_BY_DIFFICULTY = { 1: 1, 2: 4, 3: 8 } as const;

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
      const depth = DEPTH_BY_DIFFICULTY[gameState.difficulty];
      const { from, to, promotion } = await getBestMove(chess.fen(), depth);
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      if (move) {
        applyMove(move, chess);
        setLastMove({ from: move.from, to: move.to });
        setCheckSquare(findCheckSquare(chess));
        checkGameOver(chess);
      }
    } catch {
      // AI failed silently
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
