import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

export type MuralPost = Tables<"mural_posts">;

export function useMural() {
    const muralQuery = useQuery({
        queryKey: ["mural_posts"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("mural_posts")
                .select("*")
                .order("data", { ascending: false });

            if (error) throw error;
            return data as MuralPost[];
        },
    });

    return {
        posts: muralQuery.data ?? [],
        isLoading: muralQuery.isLoading,
        error: muralQuery.error,
    };
}
