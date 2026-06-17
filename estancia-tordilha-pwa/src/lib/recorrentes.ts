// Expansão de atendimentos recorrentes em "sessões virtuais" para exibição.
//
// Por que existe: `sessoes_recorrentes` guarda apenas o TEMPLATE (ex.: "Helena,
// toda sexta 13h"). As sessões concretas de cada data NÃO são materializadas na
// tabela `sessoes` — são expandidas em runtime, só para a tela. Essa lógica
// estava DUPLICADA em GestorAgenda e PaisAgenda e AUSENTE na ProfessorAgenda,
// o que fazia o terapeuta não ver nenhum atendimento mesmo após a família
// aprovar a recorrência. Centralizar aqui dá uma única fonte da verdade.
//
// Usa date-fns `getDay` (0=dom..6=sáb) para casar com `dia_semana`, e
// isMesmoDiaSP (fuso America/Sao_Paulo) para o merge com sessões reais.

import { getDay, format } from "date-fns";
import { isMesmoDiaSP } from "@/lib/dates";

// Sessão virtual derivada de uma recorrência, no mesmo formato que os
// componentes de agenda já consumiam.
export interface SessaoVirtual {
  id: string;
  data_hora: string;
  status: string;
  aluno: any;
  cavalo: any;
  recorrente_id: string;
  _isRecorrente: true;
}

/**
 * Expande as recorrências cujo dia_semana bate com `date` em sessões virtuais.
 * Comportamento idêntico ao expandRecorrentesForDay que existia em
 * GestorAgenda/PaisAgenda.
 */
export function expandRecorrentesForDay(
  recorrentes: any[],
  date: Date
): SessaoVirtual[] {
  const dow = getDay(date); // 0=dom,1=seg...6=sab
  return (recorrentes ?? [])
    .filter((r) => r.dia_semana === dow)
    .map((r) => ({
      id: `rec-${r.id}`,
      data_hora: `${format(date, "yyyy-MM-dd")}T${r.horario}`,
      status: "recorrente",
      aluno: r.aluno,
      cavalo: r.cavalo,
      recorrente_id: r.id,
      _isRecorrente: true as const,
    }));
}

/**
 * Combina sessões reais do dia `date` com as recorrências expandidas (evitando
 * duplicar uma recorrência que já virou sessão real), ordenado por horário.
 * É o `daySessoes` que as agendas montavam — agora numa única função.
 */
export function mergeDiaSessoes(
  sessoes: any[],
  recorrentes: any[],
  date: Date
): any[] {
  const real = (sessoes ?? []).filter((s) => isMesmoDiaSP(s.data_hora, date));
  const virtual = expandRecorrentesForDay(recorrentes, date).filter(
    (vr) => !real.some((r) => (r as any).recorrente_id === vr.recorrente_id)
  );
  return [...real, ...virtual].sort((a, b) =>
    a.data_hora.localeCompare(b.data_hora)
  );
}
