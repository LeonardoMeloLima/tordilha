import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Defining our standard roles
export type Role = "gestor" | "professor" | "pais";

export function useRoleSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [realRole, setRealRole] = useState<Role | null>(null);
    const [devRole, setDevRole] = useState<Role | null>(null);
    const [userName, setUserName] = useState<string>("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Get initial session — await handleUserMetadata antes de liberar
        //    loading=false. Antes o setLoading(false) disparava em paralelo
        //    com a query de profile/role, então o Index renderizava com
        //    role=null (que via safeRole="gestor") antes da role real chegar
        //    — quebrava o gate de aprovação do pais.
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            await handleUserMetadata(session);
            setLoading(false);
        });

        // 2. Listen for auth changes — também await pra garantir consistência
        //    em refresh/token-rotation.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            await handleUserMetadata(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUserMetadata = async (session: Session | null) => {
        if (session?.user) {
            const userMeta = session.user.user_metadata || {};
            const emailPart = session.user.email ? session.user.email.split('@')[0].split('.')[0] : "";
            const fallbackName = emailPart ? emailPart.charAt(0).toUpperCase() + emailPart.slice(1) : "Usuário";

            // Fonte canonical de role: a tabela `user_roles` (populada pelo
            // trigger handle_new_user). user_metadata.role pode ficar stale
            // ou sumir transientemente em refresh de token.
            const [profileRes, roleRes] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('id', session.user.id)
                    .maybeSingle(),
                supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .maybeSingle(),
            ]);

            const profile = profileRes.data;
            const canonicalRole = (roleRes.data?.role as Role | undefined)
                ?? (userMeta.role as Role | undefined);

            const fullName = profile?.full_name || userMeta.nome_completo || userMeta.full_name || fallbackName;
            const avatar = profile?.avatar_url || userMeta.avatar_url || null;

            // Preserva o role anterior se o lookup falhar (RLS, network),
            // evitando flicker pro fallback "gestor".
            setRealRole((prev) => canonicalRole ?? prev ?? "gestor");
            setUserName(fullName || "");
            setAvatarUrl(avatar);
        } else {
            setRealRole(null);
            setUserName("");
            setAvatarUrl(null);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const isSuperUser = session?.user?.email === "leonardo.informatica@gmail.com";
    const activeRole = (isSuperUser && devRole) ? devRole : realRole;
    // Todo gestor é master (acesso ao painel Admin, gerenciamento de contas,
    // bypass do gate de aprovação). Antes era hardcoded por email — agora
    // deriva do realRole pra não precisar tocar em código quando trocar de
    // gestor. SuperUser sempre é master.
    const isMaster = realRole === "gestor" || isSuperUser;

    return { 
        session, 
        role: activeRole, 
        realRole, 
        isSuperUser, 
        isMaster,
        email: session?.user?.email,
        setDevRole, 
        userName, 
        avatarUrl, 
        loading, 
        signOut 
    };
}
