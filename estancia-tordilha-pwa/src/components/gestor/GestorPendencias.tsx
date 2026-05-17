// src/components/gestor/GestorPendencias.tsx
import { useState } from "react";
import { useSolicitacoes, type SolicitacaoTipo, type SolicitacaoStatus } from "@/hooks/useSolicitacoes";
import { useDecidirSolicitacao } from "@/hooks/useDecidirSolicitacao";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalRejeitarSolicitacao } from "./ModalRejeitarSolicitacao";
import { ModalImpactoMudanca } from "@/components/shared/ModalImpactoMudanca";
import { toast } from "sonner";

const TIPO_LABEL: Record<SolicitacaoTipo, string> = {
  novo_cadastro: "Novo cadastro",
  mudanca_recorrencia: "Mudança de horário",
  remarcacao_sessao: "Remarcação avulsa",
};

const TIPO_COLOR: Record<SolicitacaoTipo, string> = {
  novo_cadastro: "bg-blue-100 text-blue-800",
  mudanca_recorrencia: "bg-purple-100 text-purple-800",
  remarcacao_sessao: "bg-orange-100 text-orange-800",
};

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function GestorPendencias() {
  const [status, setStatus] = useState<SolicitacaoStatus>("pendente");
  const [tipoFilter, setTipoFilter] = useState<SolicitacaoTipo | "todos">("todos");

  const { data: solicitacoes, isLoading } = useSolicitacoes({ status, tipo: tipoFilter });
  const decidir = useDecidirSolicitacao();

  const [rejeitando, setRejeitando] = useState<string | null>(null);
  const [impactando, setImpactando] = useState<any | null>(null);

  const handleAprovar = async (s: any) => {
    if (s.tipo === "mudanca_recorrencia") {
      setImpactando(s);
      return;
    }
    await aprovarDireto(s.id);
  };

  const aprovarDireto = async (id: string) => {
    try {
      const result = await decidir.mutateAsync({ solicitacao_id: id, decisao: "aprovar" });
      const extra = result.sessoes_atualizadas
        ? ` (${result.sessoes_atualizadas} sessão(ões) movida(s))`
        : "";
      toast.success(`Solicitação aprovada${extra}`);
    } catch (e: any) {
      toast.error(`Erro: ${e.message ?? "falha ao aprovar"}`);
    }
  };

  const handleRejeitar = async (id: string, motivo: string | undefined) => {
    try {
      await decidir.mutateAsync({ solicitacao_id: id, decisao: "rejeitar", motivo });
      toast.success("Solicitação rejeitada");
    } catch (e: any) {
      toast.error(`Erro: ${e.message ?? "falha ao rejeitar"}`);
    }
  };

  return (
    <div className="p-4 pb-32 space-y-4">
      <h1 className="text-2xl font-bold">Pendências</h1>

      <Tabs value={status} onValueChange={(v) => setStatus(v as SolicitacaoStatus)}>
        <TabsList>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovada">Decididas (aprovadas)</TabsTrigger>
          <TabsTrigger value="rejeitada">Decididas (rejeitadas)</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2 text-sm overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {(["todos", "novo_cadastro", "mudanca_recorrencia", "remarcacao_sessao"] as const).map(t => (
          <Button
            key={t}
            size="sm"
            variant={tipoFilter === t ? "default" : "outline"}
            onClick={() => setTipoFilter(t)}
            className="shrink-0 whitespace-nowrap"
          >
            {t === "todos" ? "Todos" : TIPO_LABEL[t]}
          </Button>
        ))}
      </div>

      {isLoading ? <div>Carregando...</div> : (
        <div className="space-y-3">
          {(solicitacoes ?? []).length === 0 && (
            <p className="text-muted-foreground">Nenhuma solicitação.</p>
          )}
          {(solicitacoes ?? []).map(s => (
            <Card key={s.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={TIPO_COLOR[s.tipo]}>{TIPO_LABEL[s.tipo]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.criado_em).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="font-medium">{s.aluno?.nome ?? "—"}</div>
              <Descricao tipo={s.tipo} payload={s.payload} />
              {s.status !== "pendente" && s.motivo_rejeicao && (
                <p className="text-sm text-red-700">
                  <strong>Motivo:</strong> {s.motivo_rejeicao}
                </p>
              )}
              {s.status === "pendente" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => handleAprovar(s)} disabled={decidir.isPending}>
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejeitando(s.id)}
                    disabled={decidir.isPending}
                  >
                    Rejeitar
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ModalRejeitarSolicitacao
        open={rejeitando !== null}
        onClose={() => setRejeitando(null)}
        onConfirm={async (motivo) => {
          if (rejeitando) await handleRejeitar(rejeitando, motivo);
        }}
      />

      {impactando && (
        <ModalImpactoMudanca
          open
          onClose={() => setImpactando(null)}
          onConfirm={async () => { await aprovarDireto(impactando.id); }}
          recorrencia_id={impactando.alvo_id}
          aluno_nome={impactando.aluno?.nome ?? "—"}
          atual={{
            dia_semana: impactando.payload.dia_semana_atual,
            horario: impactando.payload.horario_atual,
          }}
          novo={{
            dia_semana: impactando.payload.dia_semana_novo,
            horario: impactando.payload.horario_novo,
          }}
        />
      )}
    </div>
  );
}

function Descricao({ tipo, payload }: { tipo: SolicitacaoTipo; payload: any }) {
  if (tipo === "mudanca_recorrencia") {
    return (
      <div className="text-sm">
        De: <strong>{DIAS[payload.dia_semana_atual]} {payload.horario_atual}</strong>
        {" → "}
        Para: <strong>{DIAS[payload.dia_semana_novo]} {payload.horario_novo}</strong>
      </div>
    );
  }
  if (tipo === "remarcacao_sessao") {
    return (
      <div className="text-sm">
        De: <strong>{new Date(payload.data_hora_atual).toLocaleString("pt-BR")}</strong>
        {" → "}
        Para: <strong>{new Date(payload.data_hora_nova).toLocaleString("pt-BR")}</strong>
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Cadastro de novo praticante aguardando aprovação</div>;
}
