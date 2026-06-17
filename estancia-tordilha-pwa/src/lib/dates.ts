// Utilitários de data com timezone fixo em America/Sao_Paulo.
//
// Por que existe: o banco grava `data_hora` em ISO/UTC, mas as comparações de
// "hoje" / "mesmo dia" precisam acontecer no fuso de São Paulo (UTC-3), não no
// fuso do navegador. Usar isToday()/isSameDay() do date-fns direto sobre
// parseISO(data_hora) compara contra o dia LOCAL do navegador, o que esvazia
// listas como "Sessões Hoje" quando o navegador está em outro fuso (ou em UTC).
//
// Implementação via Intl nativo — sem dependência extra (date-fns-tz).

const SP_TIMEZONE = "America/Sao_Paulo";

// Formata uma data como "YYYY-MM-DD" no fuso de São Paulo.
function toYmdSP(date: Date): string {
  // en-CA gera o formato ISO "YYYY-MM-DD" de forma estável.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Converte um valor de data_hora (string ISO ou Date) para Date.
// Retorna null se o valor for inválido/ausente.
function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Retorna true se `dataHora` cai no dia de hoje, avaliado no fuso de São Paulo.
 * Substitui `isToday(parseISO(dataHora))`.
 */
export function isHojeSP(dataHora: string | Date | null | undefined): boolean {
  const d = asDate(dataHora);
  if (!d) return false;
  return toYmdSP(d) === toYmdSP(new Date());
}

/**
 * Retorna true se `dataHora` e `alvo` caem no mesmo dia, avaliado no fuso de
 * São Paulo. Substitui `isSameDay(parseISO(dataHora), alvo)`.
 */
export function isMesmoDiaSP(
  dataHora: string | Date | null | undefined,
  alvo: string | Date | null | undefined
): boolean {
  const a = asDate(dataHora);
  const b = asDate(alvo);
  if (!a || !b) return false;
  return toYmdSP(a) === toYmdSP(b);
}

/**
 * Retorna a chave de dia "YYYY-MM-DD" no fuso de São Paulo.
 * Substitui `format(parseISO(dataHora), "yyyy-MM-dd")` quando o objetivo é
 * agrupar/indexar por dia (ex.: pontos no calendário). Retorna "" se inválido.
 */
export function diaSP(dataHora: string | Date | null | undefined): string {
  const d = asDate(dataHora);
  return d ? toYmdSP(d) : "";
}
