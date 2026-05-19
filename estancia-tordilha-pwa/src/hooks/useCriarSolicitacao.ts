// src/hooks/useCriarSolicitacao.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SolicitacaoTipo } from "./useSolicitacoes";

interface CriarArgs {
  tipo: SolicitacaoTipo;
  aluno_id: string;
  alvo_id?: string | null;
  payload: Record<string, unknown>;
}

export function useCriarSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: CriarArgs) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("UNAUTHENTICATED");

      const { data, error } = await supabase
        .from("solicitacoes")
        .insert({
          tipo: args.tipo,
          aluno_id: args.aluno_id,
          alvo_id: args.alvo_id ?? null,
          payload: args.payload,
          solicitante_id: userData.user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("DUPLICATE_PENDING");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
    },
  });
}
