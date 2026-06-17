import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthSession } from "@/hooks/useAuthSession";
import type { Database } from "@/types/database.types";

type AlunoInsert = Database["public"]["Tables"]["alunos"]["Insert"];
type AlunoUpdate = Database["public"]["Tables"]["alunos"]["Update"];

export function useAlunos() {
    const queryClient = useQueryClient();
    // Gate na sessão: a RLS de `alunos` só permite leitura autenticada. Se a
    // query rodar durante a janela em que o token está expirado/anon (ex.: app
    // voltando do background), a RLS devolve 200 [] (sucesso vazio) e a lista
    // some sem erro. enabled atrelado à sessão impede o fetch como anon — a
    // query fica pending até a sessão estar válida, em vez de resolver vazio.
    const { session } = useAuthSession();

    const alunosQuery = useQuery({
        queryKey: ["alunos", session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("alunos")
                .select("id, nome, avatar_url, diagnostico, idade, data_nascimento, ativo, lgpd_assinado, arquivado, professor_id, autoriza_imagem, data_autorizacao_imagem, status")
                // Exclude soft-deleted (archived) students
                .eq("arquivado", false)
                .order("nome");

            if (error) throw error;
            return data;
        },
    });

    const createAluno = useMutation({
        mutationFn: async (newAluno: AlunoInsert) => {
            const { data, error } = await supabase
                .from("alunos")
                .insert(newAluno)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["alunos"] });
        },
    });

    const updateAluno = useMutation({
        mutationFn: async ({ id, ...updates }: AlunoUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from("alunos")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["alunos"] });
        },
    });

    /** Soft-delete: marks the student as arquivado=true to preserve referential integrity
     *  with historical session and evolution records. */
    const deleteAluno = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("alunos")
                .update({ arquivado: true })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["alunos"] });
        },
    });

    return {
        alunos: alunosQuery.data ?? [],
        isLoading: alunosQuery.isLoading,
        error: alunosQuery.error,
        createAluno,
        updateAluno,
        deleteAluno,
    };
}
