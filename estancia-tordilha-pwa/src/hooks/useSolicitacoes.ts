// src/hooks/useSolicitacoes.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type SolicitacaoStatus = "pendente" | "aprovada" | "rejeitada";
export type SolicitacaoTipo =
  | "novo_cadastro"
  | "mudanca_recorrencia"
  | "remarcacao_sessao"
  | "nova_recorrencia";

export type SolicitanteRole = "pais" | "professor" | "gestor" | "admin" | "outro";

export interface SolicitacaoRow {
  id: string;
  tipo: SolicitacaoTipo;
  status: SolicitacaoStatus;
  solicitante_id: string;
  aluno_id: string;
  alvo_id: string | null;
  payload: Record<string, unknown>;
  motivo_rejeicao: string | null;
  decidido_por: string | null;
  decidido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  aluno?: { nome: string; status: string; professor_id: string | null } | null;
  // Enriquecido client-side (não vem do select direto):
  solicitante_role?: SolicitanteRole;
  solicitante_nome?: string | null;
}

interface UseSolicitacoesArgs {
  status?: SolicitacaoStatus | "todas";
  tipo?: SolicitacaoTipo | "todos";
}

async function enriquecerSolicitantes(rows: SolicitacaoRow[]): Promise<SolicitacaoRow[]> {
  if (rows.length === 0) return rows;
  const ids = Array.from(new Set(rows.map((r) => r.solicitante_id)));

  // Busca roles (user_roles) e nomes (profiles) em paralelo
  const [rolesRes, profilesRes] = await Promise.all([
    supabase.from("user_roles").select("user_id, role").in("user_id", ids),
    supabase.from("profiles").select("id, full_name").in("id", ids),
  ]);

  const roleMap = new Map<string, SolicitanteRole>();
  (rolesRes.data ?? []).forEach((r) => roleMap.set(r.user_id, r.role as SolicitanteRole));

  const nameMap = new Map<string, string | null>();
  (profilesRes.data ?? []).forEach((p) => nameMap.set(p.id, p.full_name));

  return rows.map((r) => ({
    ...r,
    solicitante_role: roleMap.get(r.solicitante_id) ?? "outro",
    solicitante_nome: nameMap.get(r.solicitante_id) ?? null,
  }));
}

export function useSolicitacoes(args: UseSolicitacoesArgs = {}) {
  return useQuery({
    queryKey: ["solicitacoes", args.status ?? "todas", args.tipo ?? "todos"],
    queryFn: async () => {
      let q = supabase
        .from("solicitacoes")
        .select("*, aluno:alunos(nome, status, professor_id)")
        .order("criado_em", { ascending: false });
      if (args.status && args.status !== "todas") q = q.eq("status", args.status);
      if (args.tipo && args.tipo !== "todos") q = q.eq("tipo", args.tipo);
      const { data, error } = await q;
      if (error) throw error;
      return await enriquecerSolicitantes((data ?? []) as SolicitacaoRow[]);
    },
  });
}

/**
 * Mapa { alvo_id → SolicitacaoRow } pra lookup O(1) em cards de agenda.
 * Inclui só pendentes (que são as únicas que importam pra UI de badge).
 */
export function usePendentesByAlvo() {
  const query = useSolicitacoes({ status: "pendente" });
  const byAlvo = new Map<string, SolicitacaoRow>();
  (query.data ?? []).forEach((s) => {
    if (s.alvo_id) byAlvo.set(s.alvo_id, s);
  });
  return { ...query, byAlvo };
}

export function useSolicitacoesPendentesCount() {
  return useQuery({
    queryKey: ["solicitacoes", "count", "pendente"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("solicitacoes")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}

// Helpers compartilhados (UI)
export const STALE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

export function isSolicitacaoParada(s: SolicitacaoRow): boolean {
  if (s.status !== "pendente") return false;
  return Date.now() - new Date(s.criado_em).getTime() > STALE_THRESHOLD_MS;
}

export function diasParado(s: SolicitacaoRow): number {
  const diff = Date.now() - new Date(s.criado_em).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

/**
 * Retorna quem precisa aprovar essa solicitação (role label pt-BR).
 * Útil pra mostrar "Aguardando: terapeuta" / "Aguardando: responsável" / "Aguardando: gestor".
 */
export function aprovadorEsperado(s: SolicitacaoRow): string {
  if (s.tipo === "novo_cadastro") return "gestor";
  if (s.solicitante_role === "pais") return "terapeuta";
  if (s.solicitante_role === "professor") return "responsável";
  return "contraparte";
}
