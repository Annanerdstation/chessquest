'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { supabase, generateRoomCode } from '@/lib/supabase';
import type { GameRow } from '@/lib/supabase';

// Poll every 2s as a reliable fallback alongside websocket
const POLL_MS = 2000;
const ROLE_KEY = 'chessquest_online_role';
const CODE_KEY = 'chessquest_online_code';
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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

const DEFAULT_STATE: OnlineGameState = {
  status: 'idle',
  code: '',
  role: null,
  fen: INITIAL_FEN,
  history: [],
  isMyTurn: false,
  result: null,
  opponentConnected: false,
  error: null,
};

export function useOnlineGame() {
  const chessRef = useRef(new Chess());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFenRef = useRef<string>(INITIAL_FEN);

  const [state, setState] = useState<OnlineGameState>(DEFAULT_STATE);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopPolling();
    cleanupChannel();
  }, [stopPolling, cleanupChannel]);

  useEffect(() => () => cleanup(), [cleanup]);

  // ── Core: apply a DB row to local state ──────────────────────────────────

  const applyRow = useCallback((row: GameRow, role: OnlineRole) => {
    const chess = new Chess();
    try { chess.load(row.fen); } catch { return; }
    chessRef.current = chess;
    lastFenRef.current = row.fen;

    const isMyTurn =
      (role === 'white' && row.turn === 'w') ||
      (role === 'black' && row.turn === 'b');

    const opponentConnected = role === 'white' ? row.black_connected : row.white_connected;

    let newStatus: OnlineStatus = DEFAULT_STATE.status;
    if (row.status === 'finished') { newStatus = 'finished'; stopPolling(); }
    else if (row.status === 'playing') newStatus = 'playing';
    else if (row.status === 'waiting') newStatus = 'waiting';

    setState((prev) => ({
      ...prev,
      fen: row.fen,
      history: chess.history({ verbose: true }),
      isMyTurn,
      opponentConnected,
      status: newStatus,
      result: row.result ?? null,
    }));
  }, [stopPolling]);

  // ── Polling: fetch DB and apply if FEN changed ───────────────────────────

  const startPolling = useCallback((code: string, role: OnlineRole) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from('games').select('*').eq('code', code).single();
      if (!error && data) {
        // Always apply during waiting (detect join) and when FEN changed (detect moves)
        if (data.fen !== lastFenRef.current || data.status !== 'playing') {
          applyRow(data as GameRow, role);
        }
        // Also update opponent-connected flag even if FEN same
        const opponentConnected = role === 'white' ? data.black_connected : data.white_connected;
        setState((prev) => ({ ...prev, opponentConnected }));
      }
    }, POLL_MS);
  }, [stopPolling, applyRow]);

  // ── Realtime subscription ────────────────────────────────────────────────

  const subscribeToGame = useCallback((code: string, role: OnlineRole) => {
    cleanupChannel();
    const channel = supabase
      .channel(`game-${code}-${Date.now()}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `code=eq.${code}` },
        (payload) => { applyRow(payload.new as GameRow, role); }
      )
      .subscribe();
    channelRef.current = channel;
  }, [cleanupChannel, applyRow]);

  // ── Session recovery on mount ────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedCode = sessionStorage.getItem(CODE_KEY);
    const savedRole = sessionStorage.getItem(ROLE_KEY) as OnlineRole | null;
    if (!savedCode || !savedRole) return;

    // Try to reconnect to an active game
    (async () => {
      const { data, error } = await supabase
        .from('games').select('*').eq('code', savedCode).single();
      if (error || !data || data.status === 'finished') {
        sessionStorage.removeItem(CODE_KEY);
        sessionStorage.removeItem(ROLE_KEY);
        return;
      }
      const chess = new Chess();
      try { chess.load(data.fen); } catch { return; }
      chessRef.current = chess;
      lastFenRef.current = data.fen;

      const isMyTurn =
        (savedRole === 'white' && data.turn === 'w') ||
        (savedRole === 'black' && data.turn === 'b');
      const opponentConnected = savedRole === 'white' ? data.black_connected : data.white_connected;

      setState({
        status: data.status as OnlineStatus,
        code: data.code,
        role: savedRole,
        fen: data.fen,
        history: chess.history({ verbose: true }),
        isMyTurn,
        opponentConnected,
        result: data.result ?? null,
        error: null,
      });

      subscribeToGame(data.code, savedRole);
      startPolling(data.code, savedRole);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  const createGame = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'creating', error: null }));
    try {
      const code = generateRoomCode();
      const { error } = await supabase.from('games').insert({
        code, fen: INITIAL_FEN, turn: 'w', moves: [],
        status: 'waiting', white_connected: true, black_connected: false, result: null,
      });
      if (error) throw error;

      sessionStorage.setItem(ROLE_KEY, 'white');
      sessionStorage.setItem(CODE_KEY, code);
      lastFenRef.current = INITIAL_FEN;

      subscribeToGame(code, 'white');
      startPolling(code, 'white');

      setState((prev) => ({
        ...prev, status: 'waiting', code, role: 'white',
        fen: INITIAL_FEN, isMyTurn: true, opponentConnected: false,
      }));
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Failed to create game';
      setState((prev) => ({ ...prev, status: 'error', error: msg }));
    }
  }, [subscribeToGame, startPolling]);

  const joinGame = useCallback(async (code: string) => {
    setState((prev) => ({ ...prev, status: 'joining', error: null }));
    try {
      const { data, error } = await supabase
        .from('games').select('*').eq('code', code.toUpperCase().trim()).single();
      if (error || !data) throw new Error('Game not found. Check the code and try again.');
      if (data.status === 'finished') throw new Error('This game has already ended.');
      if (data.black_connected) throw new Error('This game is already full.');

      const { error: updateError } = await supabase
        .from('games')
        .update({ black_connected: true, status: 'playing' })
        .eq('code', data.code);
      if (updateError) throw updateError;

      sessionStorage.setItem(ROLE_KEY, 'black');
      sessionStorage.setItem(CODE_KEY, data.code);

      const chess = new Chess();
      chess.load(data.fen);
      chessRef.current = chess;
      lastFenRef.current = data.fen;

      subscribeToGame(data.code, 'black');
      startPolling(data.code, 'black');

      setState((prev) => ({
        ...prev, status: 'playing', code: data.code, role: 'black',
        fen: data.fen, history: chess.history({ verbose: true }),
        isMyTurn: false, opponentConnected: true,
      }));
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Failed to join game';
      setState((prev) => ({ ...prev, status: 'error', error: msg }));
    }
  }, [subscribeToGame, startPolling]);

  const makeMove = useCallback(async (from: string, to: string, promotion?: string) => {
    const { role, code, isMyTurn, status } = state;
    if (!isMyTurn || status !== 'playing') return false;

    const chess = chessRef.current;
    const move = chess.move({ from, to, promotion: promotion || 'q' }) as Move | null;
    if (!move) return false;

    const newFen = chess.fen();
    const newTurn = chess.turn();
    lastFenRef.current = newFen;

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

    setState((prev) => ({
      ...prev, fen: newFen,
      history: chess.history({ verbose: true }),
      isMyTurn: false, status: newStatus, result,
    }));

    const { error } = await supabase
      .from('games')
      .update({ fen: newFen, turn: newTurn, moves: newMoves, status: newStatus, result })
      .eq('code', code);

    if (error) {
      chess.undo();
      lastFenRef.current = chess.fen();
      setState((prev) => ({ ...prev, fen: chess.fen(), isMyTurn: true }));
      return false;
    }
    return true;
  }, [state]);

  const resign = useCallback(async () => {
    const { role, code } = state;
    if (!code) return;
    const result = role === 'white' ? 'black_wins' : 'white_wins';
    stopPolling();
    await supabase.from('games').update({ status: 'finished', result }).eq('code', code);
    setState((prev) => ({ ...prev, status: 'finished', result }));
  }, [state, stopPolling]);

  const reset = useCallback(() => {
    cleanup();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(ROLE_KEY);
      sessionStorage.removeItem(CODE_KEY);
    }
    chessRef.current = new Chess();
    lastFenRef.current = INITIAL_FEN;
    setState(DEFAULT_STATE);
  }, [cleanup]);

  return { state, chess: chessRef, createGame, joinGame, makeMove, resign, reset };
}
