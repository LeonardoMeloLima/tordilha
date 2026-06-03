import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Cobertura = {
  id: string;
  aluno_id: string;
  substituto_id: string;
  titular_id: string;
  tipo: "cobertura" | "transferencia";
  ativo: boolean;
  previsao_volta: string | null;
  criada_em: string;
};

/** Coberturas ativas. Leitura é aberta a autenticados; o recorte é feito por quem consome. */
export function useCoberturas() {
  const queryClient = useQueryClient();

  const coberturasQuery = useQuery({
    queryKey: ["coberturas", "ativas"],
    queryFn: async (): Promise<Cobertura[]> => {
      const { data, error } = await supabase
        .from("coberturas")
        .select("id, aluno_id, substituto_id, titular_id, tipo, ativo, previsao_volta, criada_em")
        .eq("ativo", true);
      if (error) throw error;
      return (data ?? []) as Cobertura[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["coberturas"] });
    queryClient.invalidateQueries({ queryKey: ["sessoes"] });
    queryClient.invalidateQueries({ queryKey: ["sessoes_recorrentes"] });
    queryClient.invalidateQueries({ queryKey: ["alunos"] });
  };

  const iniciarCobertura = useMutation({
    mutationFn: async (args: {
      alunoId: string;
      substitutoId: string;
      tipo: "cobertura" | "transferencia";
      previsaoVolta?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("rpc_iniciar_cobertura", {
        p_aluno_id: args.alunoId,
        p_substituto_id: args.substitutoId,
        p_tipo: args.tipo,
        p_previsao_volta: args.previsaoVolta ?? undefined,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const encerrarCobertura = useMutation({
    mutationFn: async (coberturaId: string) => {
      const { error } = await supabase.rpc("rpc_encerrar_cobertura", {
        p_cobertura_id: coberturaId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    coberturas: coberturasQuery.data ?? [],
    isLoading: coberturasQuery.isLoading,
    iniciarCobertura,
    encerrarCobertura,
  };
}
