import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { startOfMonth, subMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface MonthlySessaoStats {
    name: string; // Mês abreviado (ex: "Set")
    agendadas: number;
    realizadas: number;
}

export const useSessoesStats = () => {
    return useQuery({
        queryKey: ["sessoes-stats-mensais"],
        queryFn: async () => {
            const now = new Date();
            const sixMonthsAgo = startOfMonth(subMonths(now, 5));

            // Buscamos sessões dos últimos 6 meses
            const { data: sessoes, error: sessoesError } = await supabase
                .from("sessoes")
                .select(`
                    id,
                    data_hora,
                    evolucao_sessoes (id)
                `)
                .gte("data_hora", sixMonthsAgo.toISOString())
                .order("data_hora", { ascending: true });

            if (sessoesError) throw sessoesError;

            // Inicializamos o mapa para os 6 meses
            const statsMap: Record<string, MonthlySessaoStats> = {};

            for (let i = 5; i >= 0; i--) {
                const monthDate = subMonths(now, i);
                const monthName = format(monthDate, "MMM", { locale: ptBR }).replace(".", "");
                const monthKey = format(monthDate, "yyyy-MM");

                statsMap[monthKey] = {
                    name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                    agendadas: 0,
                    realizadas: 0
                };
            }

            // Processamos as sessões
            sessoes.forEach((sessao) => {
                const date = parseISO(sessao.data_hora);
                const monthKey = format(date, "yyyy-MM");

                if (statsMap[monthKey]) {
                    statsMap[monthKey].agendadas++;
                    // Se houver pelo menos uma evolução vinculada, consideramos "realizada"
                    if (sessao.evolucao_sessoes && (sessao.evolucao_sessoes as any[]).length > 0) {
                        statsMap[monthKey].realizadas++;
                    }
                }
            });

            return Object.values(statsMap);
        }
    });
};
