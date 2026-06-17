import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthSession } from "@/hooks/useAuthSession";

export function useResponsavelAlunos() {
    // Gate na sessão de auth: a query só roda quando há uma sessão estabelecida.
    // Isso evita o "sucesso vazio" espúrio que acontecia quando getSession()
    // era chamado durante a transição/renovação de token — a queryFn retornava
    // [] (sucesso), isLoading virava false, e consumidores como o gate de
    // aprovação em Index.tsx interpretavam como "sem vínculos" → falso bloqueio
    // ("Aguardando Aprovação") intermitente. Com enabled atrelado à sessão, a
    // query fica em estado pending (loading) durante a transição em vez de
    // resolver vazio.
    const { session } = useAuthSession();
    const email = session?.user?.email;

    return useQuery({
        queryKey: ["responsavel-alunos-vinculo", email],
        enabled: !!email,
        queryFn: async () => {
            // Revalida a sessão no momento do fetch. Se sumiu entre o enabled e
            // a execução, LANÇA erro em vez de retornar [] — assim o React Query
            // marca como error (data permanece undefined), e nunca como
            // "sucesso vazio" que confundiria o gate de aprovação.
            const { data: { session: current } } = await supabase.auth.getSession();
            const currentEmail = current?.user?.email;
            if (!currentEmail) {
                throw new Error("Sessão indisponível ao buscar vínculos do responsável");
            }

            // ilike garante match case-insensitive — emails do Supabase auth
            // são lowercase, mas registros antigos em `responsaveis` podem
            // ter capitalização diferente (ex: "Tmperez@hotmail.com").
            const { data, error } = await supabase
                .from('aluno_responsavel')
                .select('aluno_id, alunos (id, nome, avatar_url, lgpd_assinado, idade, diagnostico, status), responsaveis!inner(email)')
                .ilike('responsaveis.email', currentEmail);

            if (error) throw error;
            return data || [];
        },
    });
}
