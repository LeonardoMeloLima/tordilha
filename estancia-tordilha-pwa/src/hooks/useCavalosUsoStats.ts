import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type CavaloUso = {
    cavaloId: string;
    nome: string;
    fotoUrl: string | null;
    totalSessoes: number;
    percentualUso: number;
    percentualVsMax: number;
};

export type CavalosUsoStats = {
    totalCavalosAtivos: number;
    totalCavalosCadastrados: number;
    totalSessoesComCavalo: number;
    ranking: CavaloUso[];
};

export function useCavalosUsoStats() {
    return useQuery<CavalosUsoStats>({
        queryKey: ["cavalos-uso-stats"],
        queryFn: async () => {
            const [cavalosRes, sessoesRes] = await Promise.all([
                supabase
                    .from("cavalos")
                    .select("id, nome, status, foto_url"),
                supabase
                    .from("sessoes")
                    .select("cavalo_id")
                    .not("cavalo_id", "is", null)
                    .eq("status", "concluida"),
            ]);

            if (cavalosRes.error) throw cavalosRes.error;
            if (sessoesRes.error) throw sessoesRes.error;

            const cavalos = cavalosRes.data ?? [];
            const sessoes = sessoesRes.data ?? [];

            const usoMap = new Map<string, number>();
            sessoes.forEach(s => {
                if (!s.cavalo_id) return;
                usoMap.set(s.cavalo_id, (usoMap.get(s.cavalo_id) ?? 0) + 1);
            });

            const totalSessoesComCavalo = sessoes.length;
            const totalCavalosAtivos = cavalos.filter(c => c.status === "Ativo").length;

            const ativosComUso = cavalos
                .filter(c => c.status === "Ativo")
                .map(c => ({
                    cavaloId: c.id,
                    nome: c.nome,
                    fotoUrl: c.foto_url,
                    totalSessoes: usoMap.get(c.id) ?? 0,
                }));

            const maxUso = ativosComUso.reduce((m, c) => Math.max(m, c.totalSessoes), 0);

            const ranking: CavaloUso[] = ativosComUso
                .map(c => ({
                    ...c,
                    percentualUso: totalSessoesComCavalo === 0
                        ? 0
                        : Math.round((c.totalSessoes / totalSessoesComCavalo) * 1000) / 10,
                    percentualVsMax: maxUso === 0 ? 0 : Math.round((c.totalSessoes / maxUso) * 100),
                }))
                .sort((a, b) => b.totalSessoes - a.totalSessoes);

            return {
                totalCavalosAtivos,
                totalCavalosCadastrados: cavalos.length,
                totalSessoesComCavalo,
                ranking,
            };
        },
    });
}
