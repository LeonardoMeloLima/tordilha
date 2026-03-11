import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Notificacao {
    id: string;
    user_id: string;
    titulo: string;
    mensagem: string;
    lida: boolean;
    link?: string;
    tipo?: string;
    target_role?: string;
    criado_em: string;
}

export function useNotifications() {
    const queryClient = useQueryClient();

    const notificationsQuery = useQuery({
        queryKey: ["notificacoes"],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return [];

            const { data, error } = await supabase
                .from("notificacoes")
                .select("*")
                .eq("user_id", session.user.id)
                .order("criado_em", { ascending: false });

            if (error) throw error;
            return data as Notificacao[];
        },
    });

    const markAsRead = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("notificacoes")
                .update({ lida: true })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { error } = await supabase
                .from("notificacoes")
                .update({ lida: true })
                .eq("user_id", session.user.id)
                .eq("lida", false);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
        },
    });

    const createNotification = useMutation({
        mutationFn: async (newNotif: Omit<Notificacao, "id" | "criado_em" | "lida">) => {
            const { data, error } = await supabase
                .from("notificacoes")
                .insert([newNotif])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
    });

    return {
        notifications: notificationsQuery.data ?? [],
        unreadCount: (notificationsQuery.data ?? []).filter(n => !n.lida).length,
        isLoading: notificationsQuery.isLoading,
        markAsRead,
        markAllAsRead,
        createNotification,
    };
}
