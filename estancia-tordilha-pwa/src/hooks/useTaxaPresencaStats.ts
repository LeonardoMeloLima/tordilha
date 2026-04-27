import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type SessaoRow = {
    id: string;
    data_hora: string;
    status: string | null;
    aluno: { nome: string | null } | null;
    professor: { full_name: string | null } | null;
};

export type DiaComFalta = {
    data: string;
    dataLabel: string;
    totalFaltas: number;
};

export type TerapeutaRanking = {
    professorId: string;
    nome: string;
    concluidas: number;
    faltas: number;
    taxa: number;
};

export type FaltaRecente = {
    sessaoId: string;
    data: string;
    dataLabel: string;
    alunoNome: string;
    terapeutaNome: string;
};

export type TaxaPresencaStats = {
    taxaPercentual: number | null;
    totalConcluidas: number;
    totalFaltas: number;
    totalSessoes: number;
    diasComFaltas: DiaComFalta[];
    rankingTerapeutas: TerapeutaRanking[];
    ultimasFaltas: FaltaRecente[];
};

export function useTaxaPresencaStats() {
    return useQuery<TaxaPresencaStats>({
        queryKey: ["taxa-presenca-stats"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sessoes")
                .select(`
                    id,
                    data_hora,
                    status,
                    aluno:alunos(nome),
                    professor:profiles!sessoes_professor_id_fkey(full_name, id)
                `)
                .in("status", ["concluida", "falta"]);

            if (error) throw error;

            const rows = (data ?? []) as unknown as (SessaoRow & {
                professor: { full_name: string | null; id: string } | null;
            })[];

            const concluidas = rows.filter(r => r.status === "concluida");
            const faltas = rows.filter(r => r.status === "falta");

            const totalConcluidas = concluidas.length;
            const totalFaltas = faltas.length;
            const totalSessoes = totalConcluidas + totalFaltas;
            const taxaPercentual = totalSessoes === 0
                ? null
                : Math.round((totalConcluidas / totalSessoes) * 1000) / 10;

            // Dias com mais faltas (top 5)
            const faltasPorDia = new Map<string, number>();
            faltas.forEach(f => {
                const dia = f.data_hora.slice(0, 10);
                faltasPorDia.set(dia, (faltasPorDia.get(dia) ?? 0) + 1);
            });
            const diasComFaltas: DiaComFalta[] = Array.from(faltasPorDia.entries())
                .map(([data, totalFaltas]) => ({
                    data,
                    dataLabel: format(parseISO(data), "dd/MM/yyyy", { locale: ptBR }),
                    totalFaltas,
                }))
                .sort((a, b) => b.totalFaltas - a.totalFaltas)
                .slice(0, 5);

            // Ranking de terapeutas
            const porTerapeuta = new Map<string, { nome: string; concluidas: number; faltas: number }>();
            rows.forEach(r => {
                if (!r.professor?.id) return;
                const id = r.professor.id;
                const entry = porTerapeuta.get(id) ?? {
                    nome: r.professor.full_name || "Sem nome",
                    concluidas: 0,
                    faltas: 0,
                };
                if (r.status === "concluida") entry.concluidas++;
                if (r.status === "falta") entry.faltas++;
                porTerapeuta.set(id, entry);
            });
            const rankingTerapeutas: TerapeutaRanking[] = Array.from(porTerapeuta.entries())
                .map(([professorId, v]) => {
                    const total = v.concluidas + v.faltas;
                    const taxa = total === 0 ? 0 : Math.round((v.concluidas / total) * 1000) / 10;
                    return { professorId, nome: v.nome, concluidas: v.concluidas, faltas: v.faltas, taxa };
                })
                .sort((a, b) => (b.concluidas + b.faltas) - (a.concluidas + a.faltas))
                .slice(0, 5);

            // Últimas faltas (top 5 mais recentes)
            const ultimasFaltas: FaltaRecente[] = [...faltas]
                .sort((a, b) => b.data_hora.localeCompare(a.data_hora))
                .slice(0, 5)
                .map(f => ({
                    sessaoId: f.id,
                    data: f.data_hora,
                    dataLabel: format(parseISO(f.data_hora), "dd/MM/yyyy", { locale: ptBR }),
                    alunoNome: f.aluno?.nome || "Praticante",
                    terapeutaNome: f.professor?.full_name || "—",
                }));

            return {
                taxaPercentual,
                totalConcluidas,
                totalFaltas,
                totalSessoes,
                diasComFaltas,
                rankingTerapeutas,
                ultimasFaltas,
            };
        },
    });
}
