import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

import { useEffect } from "react";

type SessaoUpdate = Database["public"]["Tables"]["sessoes"]["Update"];

export function useSessoes(professorId?: string, alunoIds?: string[]) {
    const queryClient = useQueryClient();

    // Invalidate sessions across all components/roles when anything changes in the DB
    useEffect(() => {
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sessoes' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["sessoes"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const sessoesQuery = useQuery({
        queryKey: ["sessoes", professorId, alunoIds],
        queryFn: async () => {
            let query = supabase
                .from("sessoes")
                .select(`
                    *,
                    aluno:alunos(id, nome, avatar_url, diagnostico, idade),
                    cavalo:cavalos(id, nome, foto_url),
                    professor:profiles(id, full_name, avatar_url)
                `);

            if (professorId) {
                query = query.eq("professor_id", professorId);
            }

            if (alunoIds !== undefined) {
                if (alunoIds.length > 0) {
                    query = query.in("aluno_id", alunoIds);
                } else {
                    // Force zero results if an empty array is provided
                    query = query.eq("aluno_id", "00000000-0000-0000-0000-000000000000");
                }
            }

            const { data, error } = await query.order("data_hora", { ascending: true });

            if (error) throw error;
            return data;
        },
    });

    const createSessao = useMutation({
        mutationFn: async (newSessao: any) => {
            const { data, error } = await supabase
                .from("sessoes")
                .insert(newSessao)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessoes"] });
        },
    });


    const updateSessao = useMutation({
        mutationFn: async ({ id, ...updates }: SessaoUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from("sessoes")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessoes"] });
        },
    });

    const deleteSessao = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("sessoes")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessoes"] });
        },
    });

    return {
        sessoes: sessoesQuery.data ?? [],
        isLoading: sessoesQuery.isLoading,
        error: sessoesQuery.error,
        createSessao,
        updateSessao,
        deleteSessao,
    };
}
