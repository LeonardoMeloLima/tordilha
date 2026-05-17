// src/hooks/useSolicitacoes.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type SolicitacaoStatus = "pendente" | "aprovada" | "rejeitada";
export type SolicitacaoTipo = "novo_cadastro" | "mudanca_recorrencia" | "remarcacao_sessao";

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
  aluno?: { nome: string; status: string } | null;
}

interface UseSolicitacoesArgs {
  status?: SolicitacaoStatus | "todas";
  tipo?: SolicitacaoTipo | "todos";
}

export function useSolicitacoes(args: UseSolicitacoesArgs = {}) {
  return useQuery({
    queryKey: ["solicitacoes", args.status ?? "todas", args.tipo ?? "todos"],
    queryFn: async () => {
      let q = supabase
        .from("solicitacoes")
        .select("*, aluno:alunos(nome, status)")
        .order("criado_em", { ascending: false });
      if (args.status && args.status !== "todas") q = q.eq("status", args.status);
      if (args.tipo && args.tipo !== "todos") q = q.eq("tipo", args.tipo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SolicitacaoRow[];
    },
  });
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
