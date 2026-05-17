// src/components/shared/ModalImpactoMudanca.tsx
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  recorrencia_id: string;
  aluno_nome: string;
  atual: { dia_semana: number; horario: string };
  novo: { dia_semana: number; horario: string };
}

export function ModalImpactoMudanca({
  open, onClose, onConfirm,
  recorrencia_id, aluno_nome, atual, novo,
}: Props) {
  const { data: sessoesFuturas, isLoading } = useQuery({
    queryKey: ["sessoes_futuras_recorrencia", recorrencia_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessoes")
        .select("id, data_hora")
        .eq("recorrente_id", recorrencia_id)
        .eq("status", "agendada")
        .gt("data_hora", new Date().toISOString())
        .order("data_hora");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const impacto = (sessoesFuturas ?? []).map(s => {
    const nova = calcularNovaDataHora(new Date(s.data_hora), novo.dia_semana, novo.horario);
    return {
      id: s.id,
      atual: new Date(s.data_hora),
      nova,
      cancelada: nova.getTime() <= Date.now(),
    };
  });

  const totalCanceladas = impacto.filter(i => i.cancelada).length;
  const totalMovidas = impacto.filter(i => !i.cancelada).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirmar mudança de horário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="font-medium">{aluno_nome}</div>
          <div className="text-sm">
            De: <strong>{DIAS[atual.dia_semana]} às {atual.horario}</strong><br/>
            Para: <strong>{DIAS[novo.dia_semana]} às {novo.horario}</strong>
          </div>

          {isLoading ? (
            <div>Calculando impacto...</div>
          ) : impacto.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma sessão futura agendada será afetada. A regra recorrente será atualizada.
            </p>
          ) : (
            <>
              <p className="text-sm">
                ⚠ {totalMovidas} sessão(ões) serão movidas. {totalCanceladas > 0 && `${totalCanceladas} serão canceladas (cairiam no passado).`}
              </p>
              <ul className="text-sm max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                {impacto.slice(0, 10).map(i => (
                  <li key={i.id} className={i.cancelada ? "text-red-600" : ""}>
                    {i.atual.toLocaleString("pt-BR")} → {i.cancelada ? "CANCELADA" : i.nova.toLocaleString("pt-BR")}
                  </li>
                ))}
                {impacto.length > 10 && (
                  <li className="text-muted-foreground">... e mais {impacto.length - 10} sessões</li>
                )}
              </ul>
              <p className="text-xs text-muted-foreground">
                Sessões já realizadas ou canceladas não são afetadas.
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={async () => { await onConfirm(); onClose(); }}>
            Confirmar mudança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function calcularNovaDataHora(atual: Date, novoDia: number, novoHorario: string): Date {
  const [hh, mm] = novoHorario.split(":").map(Number);
  const diaAtual = atual.getDay();
  const offsetDias = novoDia - diaAtual;
  const nova = new Date(atual);
  nova.setDate(atual.getDate() + offsetDias);
  nova.setHours(hh, mm, 0, 0);
  return nova;
}
