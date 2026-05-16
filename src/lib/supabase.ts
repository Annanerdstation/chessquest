import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export interface GameRow {
  id: string;
  code: string;
  fen: string;
  turn: 'w' | 'b';
  moves: Array<{ from: string; to: string; san: string; promotion?: string }>;
  status: 'waiting' | 'playing' | 'finished';
  white_connected: boolean;
  black_connected: boolean;
  result: string | null;
  created_at: string;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
