'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnlineGame } from '@/hooks/useOnlineGame';
import OnlineLobby from './OnlineLobby';
import WaitingRoom from './WaitingRoom';
import OnlineGameOver from './OnlineGameOver';
import ChessBoard from '@/components/board/ChessBoard';
import MoveHistory from '@/components/game/MoveHistory';
import Button from '@/components/ui/Button';
import PromotionDialog from '@/components/game/PromotionDialog';
import { useGame } from '@/context/GameContext';

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

export default function OnlineGameScreen() {
  const router = useRouter();
  const { state, chess, createGame, joinGame, makeMove, resign, reset } = useOnlineGame();
  const { gameState } = useGame();
  const windowWidth = useWindowWidth();

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);

  const isFlipped = state.role === 'black';

  const findCheckSquare = useCallback(() => {
    const c = chess.current;
    if (!c.inCheck()) return null;
    const turn = c.turn();
    const board = c.board();
    for (let r = 0; r < 8; r++) {
      for (let cl = 0; cl < 8; cl++) {
        const piece = board[r][cl];
        if (piece?.type === 'k' && piece.color === turn) {
          return `${String.fromCharCode(97 + cl)}${8 - r}`;
        }
      }
    }
    return null;
  }, [chess]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
  };

  const tryMove = useCallback(async (from: string, to: string, promotion?: string) => {
    const c = chess.current;
    const piece = c.get(from as Parameters<typeof c.get>[0]);
    const isPromo =
      piece?.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromo && !promotion) {
      setPromotionPending({ from, to });
      return;
    }

    const ok = await makeMove(from, to, promotion);
    if (!ok) {
      triggerShake();
    } else {
      setLastMove({ from, to });
      setCheckSquare(findCheckSquare());
    }
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [chess, makeMove, findCheckSquare]);

  const handleSquareClick = useCallback((square: string) => {
    if (!state.isMyTurn || state.status !== 'playing') return;

    if (selectedSquare) {
      if (selectedSquare === square) { setSelectedSquare(null); setLegalMoves([]); return; }
      if (legalMoves.includes(square)) { tryMove(selectedSquare, square); return; }
    }

    const c = chess.current;
    const piece = c.get(square as Parameters<typeof c.get>[0]);
    const myColor = state.role === 'white' ? 'w' : 'b';
    if (!piece || piece.color !== myColor) { setSelectedSquare(null); setLegalMoves([]); return; }

    const moves = c.moves({ square: square as Parameters<typeof c.moves>[0]['square'], verbose: true });
    setSelectedSquare(square);
    setLegalMoves(moves.map((m) => m.to));
  }, [state, selectedSquare, legalMoves, tryMove, chess]);

  const handlePieceDrop = useCallback((from: string, to: string): boolean => {
    if (!state.isMyTurn || state.status !== 'playing') return false;
    const c = chess.current;
    const piece = c.get(from as Parameters<typeof c.get>[0]);
    const isPromo =
      piece?.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromo) { setPromotionPending({ from, to }); return true; }
    tryMove(from, to);
    return true;
  }, [state, tryMove, chess]);

  const confirmPromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (!promotionPending) return;
    const { from, to } = promotionPending;
    setPromotionPending(null);
    tryMove(from, to, piece);
  };

  const boardWidth = windowWidth < 640
    ? Math.min(windowWidth - 16, 400)
    : windowWidth < 1024
    ? Math.min(Math.floor((windowWidth - 32) * 0.55), 480)
    : 520;

  // Lobby
  if (state.status === 'idle' || state.status === 'error') {
    return (
      <OnlineLobby
        onCreateGame={createGame}
        onJoinGame={joinGame}
        isLoading={false}
        error={state.error}
      />
    );
  }

  if (state.status === 'creating' || state.status === 'joining') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-xl font-fredoka text-primary animate-pulse">
          {state.status === 'creating' ? 'Creating game…' : 'Joining game…'}
        </p>
      </div>
    );
  }

  if (state.status === 'waiting') {
    return <WaitingRoom code={state.code} onCancel={reset} />;
  }

  const myColor = state.role === 'white' ? '⬜' : '⬛';
  const turnColor = chess.current.turn() === 'w' ? '⬜' : '⬛';
  const turnLabel = state.isMyTurn ? `${myColor} Your turn` : `${turnColor} Opponent's turn`;

  return (
    <div className="min-h-screen bg-bg page-fade">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white shadow-sm border-b border-gray-100">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')} aria-label="Go home">
          ← Home
        </Button>
        <div className="font-fredoka text-xl text-primary">Online Game</div>
        <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-lg">{state.code}</div>
      </header>

      {/* Turn indicator */}
      <div className={`text-center py-2 border-b font-semibold text-sm ${
        state.isMyTurn
          ? 'bg-primary/10 border-primary/20 text-primary'
          : 'bg-gray-100 border-gray-200 text-gray-500'
      }`}>
        {state.opponentConnected ? turnLabel : '⏳ Waiting for opponent to join…'}
      </div>

      <main className="flex flex-col lg:flex-row items-start justify-center gap-4 p-4 max-w-5xl mx-auto">
        {/* Board */}
        <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
          {/* Opponent label */}
          <div className="w-full max-w-[520px] flex items-center gap-2 text-sm font-semibold text-gray-600">
            <span>{state.role === 'white' ? '⬛' : '⬜'}</span>
            <span>Opponent</span>
          </div>

          <ChessBoard
            fen={state.fen}
            onSquareClick={handleSquareClick}
            onPieceDrop={handlePieceDrop}
            selectedSquare={selectedSquare}
            legalMoves={state.isMyTurn ? legalMoves : []}
            lastMove={lastMove}
            checkSquare={checkSquare}
            hintFrom={null}
            hintTo={null}
            isShaking={isShaking}
            theme={gameState.theme}
            boardWidth={boardWidth > 0 ? boardWidth : 480}
            boardOrientation={isFlipped ? 'black' : 'white'}
          />

          {/* My label */}
          <div className="w-full max-w-[520px] flex items-center gap-2 text-sm font-semibold text-primary">
            <span>{myColor}</span>
            <span>You ({state.role})</span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[300px] flex flex-col gap-3">
          <MoveHistory history={state.history} collapsed={windowWidth < 640} />

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <Button
              variant="danger"
              size="sm"
              onClick={resign}
              className="w-full"
              aria-label="Resign game"
            >
              🏳️ Resign
            </Button>
          </div>
        </div>
      </main>

      {/* Promotion */}
      <PromotionDialog
        isOpen={!!promotionPending}
        color={state.role === 'white' ? 'w' : 'b'}
        onSelect={confirmPromotion}
        onCancel={() => setPromotionPending(null)}
      />

      {/* Game over */}
      <OnlineGameOver
        isOpen={state.status === 'finished'}
        result={state.result}
        role={state.role}
        onPlayAgain={reset}
        onGoHome={() => { reset(); router.push('/'); }}
      />
    </div>
  );
}
