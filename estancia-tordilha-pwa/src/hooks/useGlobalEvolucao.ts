import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useGlobalEvolucao() {
    return useQuery<number>({
        queryKey: ["global-evolucao"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_kpi_evolucao_global");

            if (error) {
                console.error("Erro ao buscar evolução global:", error);
                throw error;
            }

            return data || 0;
        },
    });
}
