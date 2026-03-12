import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface MuralComentario {
    id: string;
    post_id: string;
    user_id: string;
    conteudo: string;
    criado_em: string;
    profiles?: {
        full_name: string;
        avatar_url: string;
    };
}

export function useMuralInteractions(postId?: string) {
    const queryClient = useQueryClient();

    const commentsQuery = useQuery({
        queryKey: ["mural_comments", postId],
        queryFn: async () => {
            if (!postId) return [];
            console.log("Fetching comments for:", postId);
            const { data, error } = await supabase
                .from("mural_comentarios")
                .select(`
                    id, 
                    post_id, 
                    user_id, 
                    conteudo, 
                    criado_em,
                    profiles (full_name, avatar_url)
                `)
                .eq("post_id", postId)
                .order("criado_em", { ascending: true });

            if (error) {
                console.error("Error fetching comments:", error);
                throw error;
            }
            return data as MuralComentario[];
        },
        enabled: !!postId,
        retry: 1, // Don't retry forever if it's an RLS issue
    });

    const likesQuery = useQuery({
        queryKey: ["mural_likes", postId],
        queryFn: async () => {
            if (!postId) return { count: 0, isLiked: false };

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return { count: 0, isLiked: false };

            const { count, error } = await supabase
                .from("mural_likes")
                .select("*", { count: "exact", head: true })
                .eq("post_id", postId);

            const { data: userLike, error: likeError } = await supabase
                .from("mural_likes")
                .select("*")
                .eq("post_id", postId)
                .eq("user_id", session.user.id)
                .maybeSingle();

            if (error || likeError) throw error || likeError;

            return { count: count ?? 0, isLiked: !!userLike };
        },
        enabled: !!postId,
    });

    const toggleLike = useMutation({
        mutationFn: async ({ currentStatus }: { currentStatus: boolean }) => {
            if (!postId) return;
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Usuário não autenticado");

            if (currentStatus) {
                // Unlike
                const { error } = await supabase
                    .from("mural_likes")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", session.user.id);
                if (error) throw error;
            } else {
                // Like
                const { error } = await supabase
                    .from("mural_likes")
                    .insert([{ post_id: postId, user_id: session.user.id }]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mural_likes", postId] });
        },
    });

    const addComment = useMutation({
        mutationFn: async (conteudo: string) => {
            if (!postId) return;
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Usuário não autenticado");

            const { data, error } = await supabase
                .from("mural_comentarios")
                .insert([{
                    post_id: postId,
                    user_id: session.user.id,
                    conteudo
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mural_comments", postId] });
        },
    });

    const deleteComment = useMutation({
        mutationFn: async (commentId: string) => {
            const { error } = await supabase
                .from("mural_comentarios")
                .delete()
                .eq("id", commentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mural_comments", postId] });
        },
    });

    return {
        comments: commentsQuery.data ?? [],
        isLoadingComments: commentsQuery.isLoading,
        likesInfo: likesQuery.data ?? { count: 0, isLiked: false },
        isLoadingLikes: likesQuery.isLoading,
        toggleLike,
        addComment,
        deleteComment,
    };
}
