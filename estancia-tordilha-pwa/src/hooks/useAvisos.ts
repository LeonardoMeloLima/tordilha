import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

export type Aviso = Tables<"avisos">;

export function useAvisos() {
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

    return {
        avisos: avisosQuery.data ?? [],
        isLoading: avisosQuery.isLoading,
        error: avisosQuery.error,
    };
}
