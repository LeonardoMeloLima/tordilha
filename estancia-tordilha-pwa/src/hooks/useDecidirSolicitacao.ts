// src/hooks/useDecidirSolicitacao.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface DecidirArgs {
  solicitacao_id: string;
  decisao: "aprovar" | "rejeitar";
  motivo?: string;
}

interface DecidirResult {
  ok: boolean;
  decisao: "aprovar" | "rejeitar";
  sessoes_atualizadas?: number;
  sessoes_canceladas?: number;
}

export function useDecidirSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: DecidirArgs): Promise<DecidirResult> => {
      const { data, error } = await supabase.functions.invoke("decidir-solicitacao", {
        body: args,
      });
      if (error) throw error;
      return data as DecidirResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["sessoes"] });
      qc.invalidateQueries({ queryKey: ["sessoes_recorrentes"] });
      qc.invalidateQueries({ queryKey: ["alunos"] });
    },
  });
}
