import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Fallback values prevent the React app from crashing completely if .env is missing.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
