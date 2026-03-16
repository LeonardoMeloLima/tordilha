import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Professor = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email?: string | null;
    role?: string; // Adicionado o cargo
};

export function useProfessores() {
    const query = useQuery({
        queryKey: ["professores"],
        queryFn: async (): Promise<Professor[]> => {
            const { data: roles, error: rolesError } = await supabase
                .from("user_roles")
                .select("user_id, role")
                .in("role", ["professor", "gestor"]);

            if (rolesError) throw rolesError;
            if (!roles || roles.length === 0) return [];

            const ids = roles.map((r) => r.user_id);
            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, email")
                .in("id", ids)
                .order("full_name");

            if (profilesError) throw profilesError;

            // Mesclar o cargo no objeto do perfil
            return (profiles ?? []).map(profile => ({
                ...profile,
                role: roles.find(r => r.user_id === profile.id)?.role
            }));
        },
    });

    return {
        professores: query.data ?? [],
        isLoading: query.isLoading,
        refetch: query.refetch,
    };
}
