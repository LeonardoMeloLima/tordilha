import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const schemaRecorrencia = z.object({
  dia_semana: z.coerce.number().int().min(0).max(6),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM"),
});

const schemaSessao = z.object({
  data_hora: z.string().min(1, "Selecione data e hora"),
});

export type SugerirRecorrenciaData = z.infer<typeof schemaRecorrencia>;
export type SugerirSessaoData = z.infer<typeof schemaSessao>;

interface PropsRecorrencia {
  open: boolean;
  onClose: () => void;
  modo: "recorrencia";
  atual: { dia_semana: number; horario: string };
  onSubmit: (data: SugerirRecorrenciaData) => Promise<void>;
}
interface PropsSessao {
  open: boolean;
  onClose: () => void;
  modo: "sessao";
  atual: { data_hora: string };
  onSubmit: (data: SugerirSessaoData) => Promise<void>;
}

export function ModalSugerirHorario(props: PropsRecorrencia | PropsSessao) {
  if (props.modo === "recorrencia") {
    return <RecorrenciaForm {...props} />;
  }
  return <SessaoForm {...props} />;
}

function RecorrenciaForm({ open, onClose, atual, onSubmit }: PropsRecorrencia) {
  const form = useForm<SugerirRecorrenciaData>({
    resolver: zodResolver(schemaRecorrencia),
    defaultValues: { dia_semana: atual.dia_semana, horario: atual.horario },
  });

  const submit = form.handleSubmit(async (data) => {
    // Validar antecedência ≥ 24h
    const proximaOcorrencia = calcularProximaOcorrencia(data.dia_semana, data.horario);
    const diff = proximaOcorrencia.getTime() - Date.now();
    if (diff < 24 * 60 * 60 * 1000) {
      form.setError("horario", { message: "Mínimo 24h de antecedência." });
      return;
    }
    await onSubmit(data);
    onClose();
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sugerir novo horário fixo</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Atual</Label>
            <div className="text-sm text-muted-foreground">
              {DIAS[atual.dia_semana]} às {atual.horario}
            </div>
          </div>
          <div>
            <Label>Novo dia da semana</Label>
            <Select
              value={String(form.watch("dia_semana"))}
              onValueChange={(v) => form.setValue("dia_semana", Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIAS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Novo horário (HH:MM)</Label>
            <Input type="time" {...form.register("horario")} />
            {form.formState.errors.horario && (
              <p className="text-sm text-red-600">{form.formState.errors.horario.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>Enviar solicitação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SessaoForm({ open, onClose, atual, onSubmit }: PropsSessao) {
  const form = useForm<SugerirSessaoData>({
    resolver: zodResolver(schemaSessao),
    defaultValues: { data_hora: atual.data_hora.slice(0, 16) },
  });

  const submit = form.handleSubmit(async (data) => {
    const novaData = new Date(data.data_hora);
    const diff = novaData.getTime() - Date.now();
    if (diff < 24 * 60 * 60 * 1000) {
      form.setError("data_hora", { message: "Mínimo 24h de antecedência." });
      return;
    }
    await onSubmit(data);
    onClose();
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remarcar sessão</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Atual</Label>
            <div className="text-sm text-muted-foreground">
              {new Date(atual.data_hora).toLocaleString("pt-BR")}
            </div>
          </div>
          <div>
            <Label>Nova data e hora</Label>
            <Input type="datetime-local" {...form.register("data_hora")} />
            {form.formState.errors.data_hora && (
              <p className="text-sm text-red-600">{form.formState.errors.data_hora.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>Enviar solicitação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function calcularProximaOcorrencia(dia: number, horario: string): Date {
  const [hh, mm] = horario.split(":").map(Number);
  const agora = new Date();
  const diaAtual = agora.getDay();
  let diasAteOcorrencia = (dia - diaAtual + 7) % 7;
  const candidata = new Date(agora);
  candidata.setDate(agora.getDate() + diasAteOcorrencia);
  candidata.setHours(hh, mm, 0, 0);
  if (candidata.getTime() <= agora.getTime()) {
    candidata.setDate(candidata.getDate() + 7);
  }
  return candidata;
}
