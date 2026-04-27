import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function usePropostasHorario(options?: { alunoIds?: string[]; terapeutaId?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["propostas_horario", options],
    queryFn: async () => {
      let q = (supabase as any)
        .from("propostas_horario")
        .select(`
          *,
          aluno:alunos(id, nome, avatar_url),
          cavalo:cavalos(id, nome),
          terapeuta:profiles(id, full_name)
        `)
        .eq("status", "aguardando")
        .gt("expires_at", new Date().toISOString());

      if (options?.alunoIds !== undefined) {
        if (options.alunoIds.length > 0) {
          q = q.in("aluno_id", options.alunoIds);
        } else {
          q = q.eq("aluno_id", "00000000-0000-0000-0000-000000000000");
        }
      }
      if (options?.terapeutaId) {
        q = q.eq("terapeuta_id", options.terapeutaId);
      }

      const { data, error } = await q.order("criado_em", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const criarProposta = useMutation({
    mutationFn: async (proposta: {
      aluno_id: string;
      dia_semana: number;
      horario: string; // "HH:MM"
      cavalo_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("propostas_horario")
        .insert({
          terapeuta_id: user!.id,
          aluno_id: proposta.aluno_id,
          dia_semana: proposta.dia_semana,
          horario: proposta.horario + ":00",
          cavalo_id: proposta.cavalo_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas_horario"] });
    },
  });

  const atualizarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await (supabase as any)
        .from("propostas_horario")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas_horario"] });
    },
  });

  return {
    propostas: query.data ?? [],
    isLoading: query.isLoading,
    criarProposta,
    atualizarStatus,
  };
}
