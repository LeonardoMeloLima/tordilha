import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface StudentProgress {
    id: string;
    nome: string;
    avatar_url: string | null;
    initials: string;
    currentProgress: number; // Percentual de avanço (ex: 72)
    averages: {
        cognitivo: number;
        pedagogico: number;
        social: number;
        emocional: number;
        agitacao: number;
        interacao: number;
    };
}

export function useProgressoAlunos() {
    return useQuery({
        queryKey: ["progresso-alunos"],
        queryFn: async (): Promise<StudentProgress[]> => {
            const { data: alunos, error } = await supabase
                .from("alunos")
                .select(`
          id,
          nome,
          avatar_url,
          sessoes (
            id,
            data_hora,
            evolucao_sessoes (
              cognitivo, 
              pedagogico, 
              social, 
              emocional, 
              agitacao, 
              interacao
            )
          )
        `)
                .order('nome');

            if (error) throw error;

            return alunos.map((aluno: any) => {
                // Obter todas as sessões que possuem evolução registrada
                const sessoesComEvolucao = aluno.sessoes
                    .filter((s: any) => s.evolucao_sessoes && s.evolucao_sessoes.length > 0)
                    .sort((a: any, b: any) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());

                const initials = aluno.nome
                    ? aluno.nome
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 3)
                    : "??";

                if (sessoesComEvolucao.length === 0) {
                    return {
                        id: aluno.id,
                        nome: aluno.nome,
                        avatar_url: aluno.avatar_url,
                        initials,
                        currentProgress: 0,
                        averages: {
                            cognitivo: 0,
                            pedagogico: 0,
                            social: 0,
                            emocional: 0,
                            agitacao: 0,
                            interacao: 0,
                        },
                    };
                }

                const currentEv = sessoesComEvolucao[0].evolucao_sessoes[0];
                const previousEv = sessoesComEvolucao[1]?.evolucao_sessoes[0];

                // Calcular médias atuais
                const averages = {
                    cognitivo: currentEv.cognitivo || 0,
                    pedagogico: currentEv.pedagogico || 0,
                    social: currentEv.social || 0,
                    emocional: currentEv.emocional || 0,
                    agitacao: currentEv.agitacao || 0,
                    interacao: currentEv.interacao || 0,
                };

                // Calcular Progresso
                // Soma simples dos valores (max 30)
                const currentTotal =
                    (currentEv.cognitivo || 0) +
                    (currentEv.pedagogico || 0) +
                    (currentEv.social || 0) +
                    (currentEv.emocional || 0) +
                    (currentEv.agitacao || 0) +
                    (currentEv.interacao || 0);

                let progressPercent = 0;
                if (previousEv) {
                    const previousTotal =
                        (previousEv.cognitivo || 0) +
                        (previousEv.pedagogico || 0) +
                        (previousEv.social || 0) +
                        (previousEv.emocional || 0) +
                        (previousEv.agitacao || 0) +
                        (previousEv.interacao || 0);

                    if (previousTotal > 0) {
                        // Se melhorou, o percentual é positivo. Se piorou, negativo.
                        progressPercent = Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
                    }
                } else {
                    // Se é a primeira aula, o avanço é o quanto ele atingiu do total possível (30)
                    progressPercent = Math.round((currentTotal / 30) * 100);
                }

                return {
                    id: aluno.id,
                    nome: aluno.nome,
                    avatar_url: aluno.avatar_url,
                    initials,
                    currentProgress: progressPercent,
                    averages,
                };
            });
        },
    });
}
