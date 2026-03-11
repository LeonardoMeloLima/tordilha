import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

export type Aviso = Tables<"avisos"> & {
    target_role?: "geral" | "professor" | "pais";
};

export function useAvisos() {
    const queryClient = useQueryClient();

    const avisosQuery = useQuery({
        queryKey: ["avisos"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("avisos")
                .select("*")
                .order("data", { ascending: false });

            if (error) throw error;
            return data as Aviso[];
        },
    });

    const createAviso = useMutation({
        mutationFn: async (novoAviso: Omit<Aviso, "id" | "criado_em" | "atualizado_em">) => {
            // @ts-ignore - function created in migration but types not updated yet
            const { error } = await supabase.rpc("enviar_comunicado", {
                p_titulo: novoAviso.titulo,
                p_mensagem: novoAviso.mensagem,
                p_tipo: novoAviso.tipo,
                p_target_role: novoAviso.target_role,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["avisos"] });
            queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
        },
    });

    return {
        avisos: avisosQuery.data ?? [],
        isLoading: avisosQuery.isLoading,
        error: avisosQuery.error,
        createAviso,
    };
}
