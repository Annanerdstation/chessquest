'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useBoard } from '@/hooks/useGame';
import { useHints } from '@/hooks/useHints';
import ChessBoard from '@/components/board/ChessBoard';
import CapturedPieces from '@/components/board/CapturedPieces';
import MoveHistory from './MoveHistory';
import GameControls from './GameControls';
import GameOverModal from './GameOverModal';
import PromotionDialog from './PromotionDialog';
import Button from '@/components/ui/Button';
import type { GameMode, Difficulty } from '@/context/GameContext';

function useWindowWidth() {
  const [width, setWidth] = React.useState(0);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return width;
}

export default function GameScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get('mode') ?? 'computer') as GameMode;
  const { gameState, startGame, setGameOver, setTheme } = useGame();
  const boardHook = useBoard();
  const { hintSquares, requestHint } = useHints();
  const windowWidth = useWindowWidth();
  const initRef = useRef(false);

  // Start game on mount if not already playing
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (gameState.status !== 'playing') {
      const difficulty = (Number(searchParams.get('difficulty') ?? '1') as Difficulty) || 1;
      startGame(mode, difficulty);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPlayerTurn =
    mode === 'friend' ||
    (mode === 'computer' && boardHook.chess.current.turn() === 'w');

  const handleResign = () => {
    if (gameState.status !== 'playing') return;
    const turn = boardHook.chess.current.turn();
    setGameOver({
      outcome: 'resign',
      winner: turn === 'w' ? 'black' : 'white',
    });
  };

  const handlePlayAgain = () => {
    boardHook.chess.current.reset();
    startGame(mode, gameState.difficulty);
    initRef.current = true;
  };

  const handleThemeToggle = () => {
    setTheme(gameState.theme === 'classic' ? 'ice' : 'classic');
  };

  // Board sizing
  const boardWidth = windowWidth < 640
    ? Math.min(windowWidth - 16, 400)
    : windowWidth < 1024
    ? Math.min(Math.floor((windowWidth - 32) * 0.55), 480)
    : 520;

  const pieceColor = boardHook.chess.current.turn();

  return (
    <div className="min-h-screen bg-bg page-fade">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white shadow-sm border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          aria-label="Go home"
        >
          ← Home
        </Button>
        <div className="font-fredoka text-xl text-primary">ChessQuest</div>
        <div className="w-20 text-right">
          {gameState.isThinking && (
            <span className="text-xs text-gray-500 animate-pulse">thinking…</span>
          )}
        </div>
      </header>

      {/* Turn indicator (friend mode) */}
      {mode === 'friend' && gameState.status === 'playing' && (
        <div className="text-center py-2 bg-primary/10 border-b border-primary/20 font-semibold text-primary text-sm">
          {pieceColor === 'w' ? '⬜ White\'s Turn' : '⬛ Black\'s Turn'}
        </div>
      )}

      {/* Main layout */}
      <main className="flex flex-col lg:flex-row items-start justify-center gap-4 p-4 max-w-5xl mx-auto">
        {/* Board column */}
        <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
          {/* Captured by white */}
          <div className="w-full max-w-[520px]">
            <CapturedPieces
              capturedByWhite={gameState.capturedByWhite}
              capturedByBlack={gameState.capturedByBlack}
            />
          </div>

          {/* Board */}
          <ChessBoard
            fen={gameState.fen}
            onSquareClick={boardHook.handleSquareClick}
            onPieceDrop={boardHook.handlePieceDrop}
            selectedSquare={boardHook.selectedSquare}
            legalMoves={boardHook.legalMoves}
            lastMove={boardHook.lastMove}
            checkSquare={boardHook.checkSquare}
            hintFrom={hintSquares.from}
            hintTo={hintSquares.to}
            isShaking={boardHook.isShaking}
            theme={gameState.theme}
            boardWidth={boardWidth > 0 ? boardWidth : 480}
          />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[300px] flex flex-col gap-3">
          <GameControls
            onHint={() => requestHint(gameState.fen)}
            onUndo={boardHook.handleUndo}
            onResign={handleResign}
            onThemeToggle={handleThemeToggle}
            isPlayerTurn={isPlayerTurn}
          />

          {/* Move history — collapsed on mobile */}
          <MoveHistory history={gameState.history} collapsed={windowWidth < 640} />
        </div>
      </main>

      {/* Promotion dialog */}
      <PromotionDialog
        isOpen={!!boardHook.promotionPending}
        color={boardHook.chess.current.turn()}
        onSelect={boardHook.confirmPromotion}
        onCancel={boardHook.cancelPromotion}
      />

      {/* Game over modal */}
      <GameOverModal
        isOpen={gameState.status === 'over'}
        onPlayAgain={handlePlayAgain}
      />
    </div>
  );
}
