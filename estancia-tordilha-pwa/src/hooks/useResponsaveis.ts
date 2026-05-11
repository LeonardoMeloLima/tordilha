import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Responsavel = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  alunos_count: number;
};

export function useResponsaveis() {
  const query = useQuery({
    queryKey: ["responsaveis"],
    queryFn: async (): Promise<Responsavel[]> => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("id, nome, email, telefone, aluno_responsavel(count)")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Erro ao buscar responsáveis:", error);
        return [];
      }

      return (data ?? []).map((r: any) => ({
        id: r.id,
        nome: r.nome,
        email: r.email,
        telefone: r.telefone,
        alunos_count: r.aluno_responsavel?.[0]?.count ?? 0,
      }));
    },
  });

  return {
    responsaveis: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
