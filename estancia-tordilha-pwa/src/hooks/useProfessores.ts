import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Professor = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
};

/**
 * Fetches all users with the 'professor' role, joined with their profile data.
 * Used in the Gestor form to assign a professor to a student.
 */
export function useProfessores() {
    const query = useQuery({
        queryKey: ["professores"],
        queryFn: async (): Promise<Professor[]> => {
            // Get all user_ids with role 'professor'
            const { data: roles, error: rolesError } = await supabase
                .from("user_roles")
                .select("user_id")
                .eq("role", "professor");

            if (rolesError) throw rolesError;
            if (!roles || roles.length === 0) return [];

            const ids = roles.map((r) => r.user_id);

            // Fetch their profiles
            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .in("id", ids)
                .order("full_name");

            if (profilesError) throw profilesError;
            return profiles ?? [];
        },
    });

    return {
        professores: query.data ?? [],
        isLoading: query.isLoading,
    };
}
