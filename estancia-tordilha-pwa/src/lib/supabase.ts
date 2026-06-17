import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Fallback values prevent the React app from crashing completely if .env is missing.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Defaults do supabase-js, agora explícitos. autoRefreshToken renova o JWT
    // antes de expirar; persistSession mantém a sessão no localStorage entre
    // recargas; detectSessionInUrl trata o retorno de fluxos OAuth/magic-link.
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// PWA/mobile: quando o app fica em background (usuário troca de app/aba), o
// timer interno de autoRefresh pode ser suspenso pelo navegador e o token
// expira. Ao voltar pro foreground, requests sairiam como "anon" por uma
// janela — e a RLS de tabelas como `alunos` devolve 200 [] (sucesso vazio),
// zerando listas sem erro. startAutoRefresh() força a retomada/renovação
// imediata do token ao reativar a aba. Padrão recomendado pelo Supabase.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
  // Garante o estado inicial correto no primeiro load.
  if (document.visibilityState === "visible") {
    supabase.auth.startAutoRefresh();
  }
}
