import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useResponsavelAlunos() {
    return useQuery({
        queryKey: ["responsavel-alunos-vinculo"],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return [];

            const { data, error } = await supabase
                .from('aluno_responsavel')
                .select('aluno_id, alunos (id, nome, avatar_url, lgpd_assinado)')
                .eq('responsavel_id', session.user.id);

            if (error) throw error;
            return data || [];
        },
    });
}
