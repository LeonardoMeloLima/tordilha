// src/components/shared/PendenteBadge.tsx
import { Badge } from "@/components/ui/badge";
import {
  aprovadorEsperado,
  type SolicitacaoRow,
} from "@/hooks/useSolicitacoes";

interface Props {
  solicitacao: SolicitacaoRow | undefined;
  /** Mostra o detalhe "Aguardando: X" abaixo do badge. */
  showDetail?: boolean;
}

/**
 * Badge "Mudança pendente" + detalhe "Aguardando: terapeuta/responsável/gestor".
 * Reutilizado nas agendas dos 3 perfis pra refletir que há uma solicitação
 * pendente afetando aquele card (recorrência ou sessão).
 */
export function PendenteBadge({ solicitacao: s, showDetail = true }: Props) {
  if (!s) return null;

  const label =
    s.tipo === "mudanca_recorrencia"
      ? "Mudança pendente"
      : s.tipo === "remarcacao_sessao"
      ? "Remarcação pendente"
      : "Pendente";

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[9px] py-0 px-1.5">
        {label}
      </Badge>
      {showDetail && (
        <p className="text-[9px] text-amber-700 italic leading-tight">
          Aguardando: {aprovadorEsperado(s)}
        </p>
      )}
    </div>
  );
}
