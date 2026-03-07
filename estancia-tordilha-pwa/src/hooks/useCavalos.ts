import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

// type Cavalo = Database["public"]["Tables"]["cavalos"]["Row"];
type CavaloInsert = Database["public"]["Tables"]["cavalos"]["Insert"];
type CavaloUpdate = Database["public"]["Tables"]["cavalos"]["Update"];

export function useCavalos() {
    const queryClient = useQueryClient();

    const cavalosQuery = useQuery({
        queryKey: ["cavalos"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("cavalos")
                .select("*")
                // Exclude soft-deleted horses from the listing
                .neq("status", "Inativo")
                .order("nome");

            if (error) throw error;
            return data;
        },
    });

    const createCavalo = useMutation({
        mutationFn: async (newCavalo: CavaloInsert) => {
            const { data, error } = await supabase
                .from("cavalos")
                .insert(newCavalo)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cavalos"] });
        },
    });

    const updateCavalo = useMutation({
        mutationFn: async ({ id, ...updates }: CavaloUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from("cavalos")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cavalos"] });
        },
    });

    /** Soft-delete: marks the horse as 'Inativo' instead of deleting the row,
     *  preserving referential integrity with historical session records. */
    const deleteCavalo = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("cavalos")
                .update({ status: "Inativo" })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cavalos"] });
        },
    });

    return {
        cavalos: cavalosQuery.data ?? [],
        isLoading: cavalosQuery.isLoading,
        error: cavalosQuery.error,
        createCavalo,
        updateCavalo,
        deleteCavalo,
    };
}
