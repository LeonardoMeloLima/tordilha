// src/components/shared/PendenciasTipoFilter.tsx
// Filtro horizontal de tipos de solicitação — reusado por
// GestorPendencias e ProfessorPendencias.

const TIPOS = [
  "todos",
  "novo_cadastro",
  "mudanca_recorrencia",
  "remarcacao_sessao",
  "nova_recorrencia",
] as const;

export type PendenciasTipoFilterValue = typeof TIPOS[number];

const TIPO_LABEL: Record<PendenciasTipoFilterValue, string> = {
  todos: "Todos",
  novo_cadastro: "Novo cadastro",
  mudanca_recorrencia: "Mudança de horário",
  remarcacao_sessao: "Remarcação avulsa",
  nova_recorrencia: "Nova recorrência",
};

interface Props {
  value: PendenciasTipoFilterValue;
  onChange: (t: PendenciasTipoFilterValue) => void;
}

export function PendenciasTipoFilter({ value, onChange }: Props) {
  return (
    <div className="-mx-5 px-5 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 w-max pb-1">
        {TIPOS.map((t) => {
          const isActive = value === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={[
                "shrink-0 whitespace-nowrap px-4 h-9 rounded-full",
                "text-xs font-bold uppercase tracking-wider",
                "transition-all active:scale-95",
                isActive
                  ? "bg-[#4E593F] text-white shadow-md ring-1 ring-[#4E593F]/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300",
              ].join(" ")}
            >
              {TIPO_LABEL[t]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
