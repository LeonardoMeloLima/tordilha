import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Responsavel {
    id: string;
    nome: string;
    email: string;
    telefone?: string;
    cpf?: string;
}

export function useResponsaveis() {
    return useQuery({
        queryKey: ["all-responsaveis"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("responsaveis")
                .select("id, nome, email, telefone, cpf")
                .order("nome");

            if (error) throw error;
            return data as Responsavel[];
        },
    });
}
