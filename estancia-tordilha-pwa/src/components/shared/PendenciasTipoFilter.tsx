// src/components/shared/PendenciasTipoFilter.tsx
// Filtro de tipos de solicitação — Select compacto reusado por
// GestorPendencias e ProfessorPendencias.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export type PendenciasTipoFilterValue =
  | "todos"
  | "novo_cadastro"
  | "mudanca_recorrencia"
  | "remarcacao_sessao"
  | "nova_recorrencia";

const OPCOES: { value: PendenciasTipoFilterValue; label: string }[] = [
  { value: "todos", label: "Todos os tipos" },
  { value: "novo_cadastro", label: "Novo cadastro" },
  { value: "mudanca_recorrencia", label: "Mudança de horário" },
  { value: "remarcacao_sessao", label: "Remarcação avulsa" },
  { value: "nova_recorrencia", label: "Novo atendimento recorrente" },
];

interface Props {
  value: PendenciasTipoFilterValue;
  onChange: (t: PendenciasTipoFilterValue) => void;
}

export function PendenciasTipoFilter({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PendenciasTipoFilterValue)}>
      <SelectTrigger className="w-full h-12 rounded-2xl border-slate-200 bg-white card-shadow px-4 text-sm font-bold">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter size={16} className="text-[#4E593F]" strokeWidth={2} />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-2xl">
        {OPCOES.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-sm font-medium">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
