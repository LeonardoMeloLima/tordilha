import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useResponsavelAlunos() {
    return useQuery({
        queryKey: ["responsavel-alunos-vinculo"],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) return [];

            const { data, error } = await supabase
                .from('aluno_responsavel')
                .select('aluno_id, alunos (id, nome, avatar_url, lgpd_assinado, idade, diagnostico), responsaveis!inner(email)')
                .eq('responsaveis.email', session.user.email);

            if (error) throw error;
            return data || [];
        },
    });
}
