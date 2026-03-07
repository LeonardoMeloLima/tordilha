import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type EvolucaoInsert = Database["public"]["Tables"]["evolucao_sessoes"]["Insert"];
type EvolucaoUpdate = Database["public"]["Tables"]["evolucao_sessoes"]["Update"];

export function useEvolucao() {
    const queryClient = useQueryClient();

    const getEvolucaoBySessao = (sessaoId: string) => useQuery({
        queryKey: ["evolucao", sessaoId],
        queryFn: async () => {
            if (!sessaoId) return null;
            const { data, error } = await supabase
                .from("evolucao_sessoes")
                .select("*")
                .eq("sessao_id", sessaoId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!sessaoId,
    });

    const createEvolucao = useMutation({
        mutationFn: async (newEvolucao: EvolucaoInsert) => {
            const { data, error } = await supabase
                .from("evolucao_sessoes")
                .insert(newEvolucao)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["evolucao", data.sessao_id] });
            queryClient.invalidateQueries({ queryKey: ["sessoes"] });
        },
    });

    const updateEvolucao = useMutation({
        mutationFn: async ({ id, ...updates }: EvolucaoUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from("evolucao_sessoes")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["evolucao", data.sessao_id] });
        },
    });

    return {
        getEvolucaoBySessao,
        createEvolucao,
        updateEvolucao,
    };
}
