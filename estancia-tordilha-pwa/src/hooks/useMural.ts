import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

export type MuralPost = Tables<"mural_posts">;

export function useMural(alunoId?: string) {
    const queryClient = useQueryClient();

    const muralQuery = useQuery({
        queryKey: ["mural_posts", alunoId],
        queryFn: async () => {
            let query = supabase
                .from("mural_posts")
                .select("*");

            if (alunoId) {
                query = query.or(`aluno_id.eq.${alunoId},aluno_id.is.null`);
            }

            const { data, error } = await query.order("criado_em", { ascending: false });

            if (error) throw error;
            return data as MuralPost[];
        },
    });

    const createPost = useMutation({
        mutationFn: async (newPost: any) => {
            const { data, error } = await supabase
                .from("mural_posts")
                .insert([newPost])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mural_posts"] });
        },
    });

    return {
        posts: muralQuery.data ?? [],
        isLoading: muralQuery.isLoading,
        error: muralQuery.error,
        createPost,
    };
}
