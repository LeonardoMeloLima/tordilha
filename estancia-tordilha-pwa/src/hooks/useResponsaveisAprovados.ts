import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useResponsaveisAprovados() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["all-responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("id, nome, email, telefone, cpf, rg, endereco, cidade, estado, criado_em")
        .eq("status", "aprovado")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...fields }: any) => {
      const { error } = await supabase.from("responsaveis").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-responsaveis"] });
    },
  });

  return {
    responsaveis: query.data ?? [],
    isLoading: query.isLoading,
    update,
  };
}
