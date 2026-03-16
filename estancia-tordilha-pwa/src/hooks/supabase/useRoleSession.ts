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
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            handleUserMetadata(session);
            setLoading(false);
        });

        // 2. Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            handleUserMetadata(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUserMetadata = async (session: Session | null) => {
        if (session?.user) {
            const userMeta = session.user.user_metadata || {};
            const emailPart = session.user.email ? session.user.email.split('@')[0].split('.')[0] : "";
            const fallbackName = emailPart ? emailPart.charAt(0).toUpperCase() + emailPart.slice(1) : "Usuário";

            const userRole = userMeta.role;

            // Fetch from profiles table — handle_new_user trigger always populates it correctly
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', session.user.id)
                .maybeSingle();

            const fullName = profile?.full_name || userMeta.nome_completo || userMeta.full_name || fallbackName;
            const avatar = profile?.avatar_url || userMeta.avatar_url || null;

            setRealRole((userRole as Role) || "gestor"); // fallback to gestor
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
    const isMaster = session?.user?.email === "tais@gestor.com" || isSuperUser;
    const activeRole = (isSuperUser && devRole) ? devRole : realRole;

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
