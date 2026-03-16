import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface FichaAtendimento {
  id?: string;
  aluno_id: string;
  equipe?: string;
  cavalo_id?: string;
  encilhamento?: string;
  objetivo_t1?: string;
  objetivo_t2?: string;
  objetivo_t3?: string;
  objetivo_t4?: string;
  atualizado_em?: string;
}

export function useFichaAtendimento(alunoId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ficha-atendimento", alunoId],
    queryFn: async () => {
      if (!alunoId) return null;
      const { data, error } = await (supabase as any)
        .from("fichas_atendimento")
        .select("*")
        .eq("aluno_id", alunoId)
        .maybeSingle();

      if (error) throw error;
      return data as FichaAtendimento | null;
    },
    enabled: !!alunoId,
  });

  const upsertFicha = useMutation({
    mutationFn: async (ficha: FichaAtendimento) => {
      const { data, error } = await (supabase as any)
        .from("fichas_atendimento")
        .upsert({
          ...ficha,
          atualizado_em: new Date().toISOString(),
        }, {
          onConflict: 'aluno_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ficha-atendimento", alunoId] });
    },
  });

  return {
    ficha: query.data,
    isLoading: query.isLoading,
    upsertFicha,
  };
}
