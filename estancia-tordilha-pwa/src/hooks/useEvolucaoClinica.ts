import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

export type EvolucaoClinica = Database["public"]["Functions"]["get_evolucao_clinica_recente"]["Returns"][number];

export function useEvolucaoClinica() {
    return useQuery<EvolucaoClinica[]>({
        queryKey: ["evolucao-clinica-recente"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_evolucao_clinica_recente");

            if (error) {
                console.error("Erro ao buscar evolução clínica:", error);
                throw error;
            }

            return data;
        },
    });
}
