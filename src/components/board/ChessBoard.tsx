'use client';

import React, { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import type { SquareHandlerArgs, PieceDropHandlerArgs } from 'react-chessboard';

interface ChessBoardProps {
  fen: string;
  onSquareClick: (square: string) => void;
  onPieceDrop: (from: string, to: string) => boolean;
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  hintFrom: string | null;
  hintTo: string | null;
  isShaking: boolean;
  theme: 'classic' | 'ice';
  boardWidth?: number;
}

const THEME_STYLES = {
  classic: {
    light: { backgroundColor: '#F0D9B5' },
    dark: { backgroundColor: '#B58863' },
  },
  ice: {
    light: { backgroundColor: '#D6EAF8' },
    dark: { backgroundColor: '#2E86C1' },
  },
};

export default function ChessBoard({
  fen,
  onSquareClick,
  onPieceDrop,
  selectedSquare,
  legalMoves,
  lastMove,
  checkSquare,
  hintFrom,
  hintTo,
  isShaking,
  theme,
  boardWidth = 480,
}: ChessBoardProps) {
  const themeStyles = THEME_STYLES[theme];

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      const amber: React.CSSProperties = { backgroundColor: 'rgba(251,191,36,0.35)' };
      styles[lastMove.from] = amber;
      styles[lastMove.to] = amber;
    }

    if (checkSquare) {
      styles[checkSquare] = {
        ...styles[checkSquare],
        backgroundColor: 'rgba(230,57,70,0.5)',
        boxShadow: 'inset 0 0 0 3px rgba(230,57,70,0.9)',
      };
    }

    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        backgroundColor: 'rgba(45,106,79,0.4)',
        boxShadow: 'inset 0 0 0 3px rgba(45,106,79,0.8)',
      };
    }

    for (const sq of legalMoves) {
      const existing = styles[sq]?.backgroundColor as string | undefined;
      styles[sq] = {
        ...styles[sq],
        background: existing
          ? `radial-gradient(circle, rgba(0,0,0,0.2) 30%, transparent 31%), ${existing}`
          : 'radial-gradient(circle, rgba(0,0,0,0.2) 30%, transparent 31%)',
      };
    }

    if (hintFrom) {
      styles[hintFrom] = {
        ...styles[hintFrom],
        boxShadow: '0 0 0 4px rgba(234,179,8,0.8), inset 0 0 8px rgba(234,179,8,0.3)',
        backgroundColor: 'rgba(234,179,8,0.2)',
      };
    }
    if (hintTo) {
      styles[hintTo] = {
        ...styles[hintTo],
        boxShadow: '0 0 0 4px rgba(234,179,8,0.6)',
        backgroundColor: 'rgba(234,179,8,0.15)',
      };
    }

    return styles;
  }, [lastMove, checkSquare, selectedSquare, legalMoves, hintFrom, hintTo]);

  const handleSquareClick = ({ square }: SquareHandlerArgs) => {
    onSquareClick(square);
  };

  const handlePieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (!targetSquare) return false;
    return onPieceDrop(sourceSquare, targetSquare);
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-xl ${isShaking ? 'board-shake' : ''}`}
      aria-label="Chess board"
    >
      <Chessboard
        options={{
          position: fen,
          squareStyles,
          darkSquareStyle: themeStyles.dark,
          lightSquareStyle: themeStyles.light,
          boardStyle: { width: boardWidth, height: boardWidth },
          animationDurationInMs: 150,
          allowDrawingArrows: false,
          onSquareClick: handleSquareClick,
          onPieceDrop: handlePieceDrop,
        }}
      />
    </div>
  );
}
