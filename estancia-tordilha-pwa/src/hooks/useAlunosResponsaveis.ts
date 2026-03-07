import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ResponsavelLink {
    id: string;
    nome: string;
    email: string;
    parentesco: string;
}

export function useAlunosResponsaveis(alunoId: string | null) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["aluno-responsaveis", alunoId],
        queryFn: async () => {
            if (!alunoId) return [];
            const { data, error } = await supabase
                .from("aluno_responsavel")
                .select(`
          parentesco,
          responsaveis (
            id,
            nome,
            email
          )
        `)
                .eq("aluno_id", alunoId);

            if (error) throw error;

            return (data || []).map((item: any) => ({
                id: item.responsaveis.id,
                nome: item.responsaveis.nome,
                email: item.responsaveis.email,
                parentesco: item.parentesco,
            })) as ResponsavelLink[];
        },
        enabled: !!alunoId,
    });

    const linkResponsavel = useMutation({
        mutationFn: async ({
            nome,
            email,
            parentesco,
        }: {
            nome: string;
            email: string;
            parentesco: string;
        }) => {
            if (!alunoId) throw new Error("ID do aluno não fornecido");

            // 1. Check if responsible exists
            let { data: resp, error: fetchError } = await supabase
                .from("responsaveis")
                .select("id")
                .eq("email", email)
                .maybeSingle();

            if (fetchError) throw fetchError;

            let responsavelId = resp?.id;

            // 2. Create if not exists
            if (!responsavelId) {
                const { data: newResp, error: createError } = await supabase
                    .from("responsaveis")
                    .insert({ nome, email })
                    .select("id")
                    .single();

                if (createError) throw createError;
                responsavelId = newResp.id;
            }

            // 3. Link to student
            const { error: linkError } = await supabase
                .from("aluno_responsavel")
                .insert({
                    aluno_id: alunoId,
                    responsavel_id: responsavelId,
                    parentesco,
                });

            if (linkError) throw linkError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["aluno-responsaveis", alunoId] });
        },
    });

    const unlinkResponsavel = useMutation({
        mutationFn: async (responsavelId: string) => {
            if (!alunoId) throw new Error("ID do aluno não fornecido");
            const { error } = await supabase
                .from("aluno_responsavel")
                .delete()
                .eq("aluno_id", alunoId)
                .eq("responsavel_id", responsavelId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["aluno-responsaveis", alunoId] });
        },
    });

    return {
        responsaveis: query.data || [],
        isLoading: query.isLoading,
        linkResponsavel,
        unlinkResponsavel,
    };
}
