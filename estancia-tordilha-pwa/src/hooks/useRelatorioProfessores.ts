import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface RelatorioProfessor {
    professor_id: string;
    nome_professor: string;
    total_sessoes: number;
    total_alunos_unicos: number;
}

export function useRelatorioProfessores() {
    return useQuery({
        queryKey: ["relatorio-professores"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_relatorio_professores");

            if (error) {
                console.error("Erro ao buscar relatório de professores:", error);
                throw error;
            }

            return data as RelatorioProfessor[];
        },
    });
}
