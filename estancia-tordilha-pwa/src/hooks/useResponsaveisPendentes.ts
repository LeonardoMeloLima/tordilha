import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useResponsaveisPendentes() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["responsaveis-pendentes"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("responsaveis")
                .select("id, nome, email, telefone, cpf, criado_em, status")
                .neq("status", "aprovado")
                .order("criado_em", { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
    });

    const aprovar = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("responsaveis")
                .update({ status: "aprovado" })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["responsaveis-pendentes"] });
            queryClient.invalidateQueries({ queryKey: ["all-responsaveis"] });
        },
    });

    const rejeitar = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("responsaveis")
                .update({ status: "rejeitado" })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["responsaveis-pendentes"] });
        },
    });

    const pendentes = query.data?.filter(r => r.status === "pendente") ?? [];
    const rejeitados = query.data?.filter(r => r.status === "rejeitado") ?? [];

    return {
        pendentes,
        rejeitados,
        totalPendentes: pendentes.length,
        isLoading: query.isLoading,
        aprovar,
        rejeitar,
    };
}
