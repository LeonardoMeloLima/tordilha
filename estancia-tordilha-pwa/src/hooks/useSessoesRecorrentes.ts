import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type SessaoRecorrente = Database["public"]["Tables"]["sessoes_recorrentes"]["Row"];
type SessaoRecorrenteInsert = Database["public"]["Tables"]["sessoes_recorrentes"]["Insert"];

export const DIAS_SEMANA = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export function useSessoesRecorrentes(alunoIds?: string[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sessoes_recorrentes", alunoIds],
    queryFn: async () => {
      let q = supabase
        .from("sessoes_recorrentes")
        .select(`
          *,
          aluno:alunos(id, nome, avatar_url, diagnostico),
          cavalo:cavalos(id, nome, foto_url),
          professor:profiles(id, full_name, avatar_url)
        `)
        .eq("ativo", true);

      if (alunoIds !== undefined) {
        if (alunoIds.length > 0) {
          q = q.in("aluno_id", alunoIds);
        } else {
          q = q.eq("aluno_id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data, error } = await q.order("dia_semana").order("horario");
      if (error) throw error;
      return data;
    },
  });

  const createRecorrente = useMutation({
    mutationFn: async (nova: SessaoRecorrenteInsert) => {
      const { data, error } = await supabase
        .from("sessoes_recorrentes")
        .insert(nova)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessoes_recorrentes"] });
    },
  });

  const toggleRecorrente = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from("sessoes_recorrentes")
        .update({ ativo })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessoes_recorrentes"] });
    },
  });

  const deleteRecorrente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sessoes_recorrentes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessoes_recorrentes"] });
    },
  });

  return {
    recorrentes: query.data ?? [],
    isLoading: query.isLoading,
    createRecorrente,
    toggleRecorrente,
    deleteRecorrente,
  };
}
