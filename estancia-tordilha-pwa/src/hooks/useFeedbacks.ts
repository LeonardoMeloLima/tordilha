import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type FeedbackCategoria = "sugestao" | "reclamacao" | "elogio";

export function useFeedbacks() {
    const queryClient = useQueryClient();

    const feedbacksQuery = useQuery({
        queryKey: ["feedbacks"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("feedbacks")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const enviarFeedback = useMutation({
        mutationFn: async (payload: {
            responsavel_id: string;
            responsavel_nome: string;
            categoria: FeedbackCategoria;
            mensagem: string;
        }) => {
            const { error } = await supabase.from("feedbacks").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
        },
    });

    const marcarLido = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("feedbacks")
                .update({ lida: true })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
        },
    });

    return {
        feedbacks: feedbacksQuery.data ?? [],
        isLoading: feedbacksQuery.isLoading,
        enviarFeedback,
        marcarLido,
    };
}
