// src/components/shared/ModalPropoeRecorrencia.tsx
//
// Modal compartilhado pra propor uma NOVA aula recorrente. Usado tanto pelo
// terapeuta ("propor pra um dos meus praticantes") quanto pelo pais ("propor
// pra um dos meus filhos"). A diferença está só nas `alunoOptions` que o
// chamador passa.
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const schema = z.object({
  aluno_id: z.string().min(1, "Selecione o praticante"),
  dia_semana: z.coerce.number().int().min(0).max(6),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM"),
});

export type PropoeRecorrenciaData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  alunoOptions: { id: string; nome: string }[];
  defaultAlunoId?: string;
  onSubmit: (data: PropoeRecorrenciaData) => Promise<void>;
  /** Pular validação 24h (raro — só pra cenários de admin). */
  pularValidacao24h?: boolean;
}

export function ModalPropoeRecorrencia({
  open,
  onClose,
  alunoOptions,
  defaultAlunoId,
  onSubmit,
  pularValidacao24h,
}: Props) {
  const form = useForm<PropoeRecorrenciaData>({
    resolver: zodResolver(schema),
    defaultValues: {
      aluno_id: defaultAlunoId ?? (alunoOptions[0]?.id ?? ""),
      dia_semana: 1, // Segunda como default razoável
      horario: "08:00",
    },
  });

  const submit = form.handleSubmit(async (data) => {
    if (!pularValidacao24h) {
      const proximaOcorrencia = calcularProximaOcorrencia(data.dia_semana, data.horario);
      const diff = proximaOcorrencia.getTime() - Date.now();
      if (diff < 24 * 60 * 60 * 1000) {
        form.setError("horario", { message: "Mínimo 24h de antecedência." });
        return;
      }
    }
    await onSubmit(data);
    onClose();
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propor nova aula recorrente</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Praticante</Label>
            <Select
              value={form.watch("aluno_id")}
              onValueChange={(v) => form.setValue("aluno_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um praticante" />
              </SelectTrigger>
              <SelectContent>
                {alunoOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.aluno_id && (
              <p className="text-sm text-red-600">{form.formState.errors.aluno_id.message}</p>
            )}
          </div>

          <div>
            <Label>Dia da semana</Label>
            <Select
              value={String(form.watch("dia_semana"))}
              onValueChange={(v) => form.setValue("dia_semana", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAS.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Horário (HH:MM)</Label>
            <Input type="time" {...form.register("horario")} />
            {form.formState.errors.horario && (
              <p className="text-sm text-red-600">{form.formState.errors.horario.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || alunoOptions.length === 0}>
              Enviar proposta
            </Button>
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
  const diasAteOcorrencia = (dia - diaAtual + 7) % 7;
  const candidata = new Date(agora);
  candidata.setDate(agora.getDate() + diasAteOcorrencia);
  candidata.setHours(hh, mm, 0, 0);
  if (candidata.getTime() <= agora.getTime()) {
    candidata.setDate(candidata.getDate() + 7);
  }
  return candidata;
}
