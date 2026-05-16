'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { supabase, generateRoomCode } from '@/lib/supabase';
import type { GameRow } from '@/lib/supabase';

export type OnlineRole = 'white' | 'black';
export type OnlineStatus = 'idle' | 'creating' | 'waiting' | 'joining' | 'playing' | 'finished' | 'error';

export interface OnlineGameState {
  status: OnlineStatus;
  code: string;
  role: OnlineRole | null;
  fen: string;
  history: Move[];
  isMyTurn: boolean;
  result: string | null;
  opponentConnected: boolean;
  error: string | null;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ROLE_KEY = 'chessquest_online_role';
const CODE_KEY = 'chessquest_online_code';

export function useOnlineGame() {
  const chessRef = useRef(new Chess());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [state, setState] = useState<OnlineGameState>({
    status: 'idle',
    code: '',
    role: null,
    fen: INITIAL_FEN,
    history: [],
    isMyTurn: false,
    result: null,
    opponentConnected: false,
    error: null,
  });

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const applyGameRow = useCallback((row: GameRow, role: OnlineRole) => {
    const chess = new Chess();
    try {
      chess.load(row.fen);
    } catch {
      return;
    }
    chessRef.current = chess;

    const isMyTurn =
      (role === 'white' && row.turn === 'w') ||
      (role === 'black' && row.turn === 'b');

    const opponentConnected =
      role === 'white' ? row.black_connected : row.white_connected;

    setState((prev) => ({
      ...prev,
      fen: row.fen,
      history: chess.history({ verbose: true }),
      isMyTurn,
      opponentConnected,
      status: row.status === 'finished' ? 'finished' : row.status === 'playing' ? 'playing' : prev.status,
      result: row.result ?? null,
    }));
  }, []);

  const subscribeToGame = useCallback((code: string, role: OnlineRole) => {
    cleanup();

    const channel = supabase
      .channel(`game:${code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `code=eq.${code}` },
        (payload) => {
          applyGameRow(payload.new as GameRow, role);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [cleanup, applyGameRow]);

  const createGame = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'creating', error: null }));

    try {
      const code = generateRoomCode();

      const { error } = await supabase.from('games').insert({
        code,
        fen: INITIAL_FEN,
        turn: 'w',
        moves: [],
        status: 'waiting',
        white_connected: true,
        black_connected: false,
        result: null,
      });

      if (error) throw error;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ROLE_KEY, 'white');
        sessionStorage.setItem(CODE_KEY, code);
      }

      subscribeToGame(code, 'white');

      setState((prev) => ({
        ...prev,
        status: 'waiting',
        code,
        role: 'white',
        fen: INITIAL_FEN,
        isMyTurn: true,
        opponentConnected: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to create game',
      }));
    }
  }, [subscribeToGame]);

  const joinGame = useCallback(async (code: string) => {
    setState((prev) => ({ ...prev, status: 'joining', error: null }));

    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .single();

      if (error || !data) throw new Error('Game not found. Check the code and try again.');
      if (data.status === 'finished') throw new Error('This game has already ended.');
      if (data.black_connected) throw new Error('This game is already full.');

      const { error: updateError } = await supabase
        .from('games')
        .update({ black_connected: true, status: 'playing' })
        .eq('code', data.code);

      if (updateError) throw updateError;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ROLE_KEY, 'black');
        sessionStorage.setItem(CODE_KEY, data.code);
      }

      const chess = new Chess();
      chess.load(data.fen);
      chessRef.current = chess;

      subscribeToGame(data.code, 'black');

      setState((prev) => ({
        ...prev,
        status: 'playing',
        code: data.code,
        role: 'black',
        fen: data.fen,
        history: chess.history({ verbose: true }),
        isMyTurn: false,
        opponentConnected: true,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to join game',
      }));
    }
  }, [subscribeToGame]);

  const makeMove = useCallback(async (from: string, to: string, promotion?: string) => {
    const { role, code, isMyTurn, status } = state;
    if (!isMyTurn || status !== 'playing') return false;

    const chess = chessRef.current;
    const move = chess.move({ from, to, promotion: promotion || 'q' }) as Move | null;
    if (!move) return false;

    const newFen = chess.fen();
    const newTurn = chess.turn();
    const newMoves = chess.history({ verbose: true }).map((m) => ({
      from: m.from, to: m.to, san: m.san, promotion: m.promotion,
    }));

    let newStatus: 'playing' | 'finished' = 'playing';
    let result: string | null = null;

    if (chess.isCheckmate()) {
      newStatus = 'finished';
      result = role === 'white' ? 'white_wins' : 'black_wins';
    } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      newStatus = 'finished';
      result = 'draw';
    }

    // Optimistic local update
    setState((prev) => ({
      ...prev,
      fen: newFen,
      history: chess.history({ verbose: true }),
      isMyTurn: false,
      status: newStatus,
      result,
    }));

    const { error } = await supabase
      .from('games')
      .update({ fen: newFen, turn: newTurn, moves: newMoves, status: newStatus, result })
      .eq('code', code);

    if (error) {
      // Rollback on failure
      chess.undo();
      setState((prev) => ({ ...prev, fen: chess.fen(), isMyTurn: true }));
      return false;
    }

    return true;
  }, [state]);

  const resign = useCallback(async () => {
    const { role, code } = state;
    if (!code) return;

    const result = role === 'white' ? 'black_wins' : 'white_wins';
    await supabase.from('games').update({ status: 'finished', result }).eq('code', code);

    setState((prev) => ({ ...prev, status: 'finished', result }));
  }, [state]);

  const reset = useCallback(() => {
    cleanup();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(ROLE_KEY);
      sessionStorage.removeItem(CODE_KEY);
    }
    chessRef.current = new Chess();
    setState({
      status: 'idle',
      code: '',
      role: null,
      fen: INITIAL_FEN,
      history: [],
      isMyTurn: false,
      result: null,
      opponentConnected: false,
      error: null,
    });
  }, [cleanup]);

  return {
    state,
    chess: chessRef,
    createGame,
    joinGame,
    makeMove,
    resign,
    reset,
  };
}
