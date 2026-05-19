// src/components/gestor/ModalRejeitarSolicitacao.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string | undefined) => Promise<void>;
}

export function ModalRejeitarSolicitacao({ open, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar solicitação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Motivo (opcional)</Label>
          <Textarea
            placeholder="Ex: horário sem instrutor disponível, conflito com outra turma..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onConfirm(motivo.trim() || undefined);
                onClose();
              } finally {
                setSubmitting(false);
                setMotivo("");
              }
            }}
          >
            Rejeitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
