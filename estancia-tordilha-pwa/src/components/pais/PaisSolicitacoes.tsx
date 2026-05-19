// src/components/pais/PaisSolicitacoes.tsx
import { useState } from "react";
import {
  useSolicitacoes,
  type SolicitacaoStatus,
  type SolicitacaoRow,
} from "@/hooks/useSolicitacoes";
import { useDecidirSolicitacao } from "@/hooks/useDecidirSolicitacao";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModalRejeitarSolicitacao } from "@/components/gestor/ModalRejeitarSolicitacao";
import { ModalImpactoMudanca } from "@/components/shared/ModalImpactoMudanca";
import { toast } from "sonner";

const TIPO_LABEL: Record<string, string> = {
  novo_cadastro: "Novo cadastro",
  mudanca_recorrencia: "Mudança de horário",
  remarcacao_sessao: "Remarcação avulsa",
  nova_recorrencia: "Nova aula recorrente",
};

const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovada: "bg-green-100 text-green-800",
  rejeitada: "bg-red-100 text-red-800",
};

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function PaisSolicitacoes() {
  const [filter, setFilter] = useState<SolicitacaoStatus | "todas">("todas");
  const { data: solicitacoes, isLoading } = useSolicitacoes({ status: filter });
  const decidir = useDecidirSolicitacao();

  const [rejeitando, setRejeitando] = useState<string | null>(null);
  const [impactando, setImpactando] = useState<SolicitacaoRow | null>(null);

  if (isLoading) return <div className="p-4">Carregando...</div>;

  const handleAprovar = async (s: SolicitacaoRow) => {
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
      if (e?.message === "STALE_REQUEST") {
        toast.error("Esta solicitação expirou — peça pro terapeuta refazer");
      } else {
        toast.error(`Erro: ${e?.message ?? "falha ao aprovar"}`);
      }
    }
  };

  const handleRejeitar = async (id: string, motivo: string | undefined) => {
    try {
      await decidir.mutateAsync({ solicitacao_id: id, decisao: "rejeitar", motivo });
      toast.success("Solicitação rejeitada");
    } catch (e: any) {
      if (e?.message === "STALE_REQUEST") {
        toast.error("Esta solicitação expirou — peça pro terapeuta refazer");
      } else {
        toast.error(`Erro: ${e?.message ?? "falha ao rejeitar"}`);
      }
    }
  };

  return (
    <div className="p-4 pb-32 space-y-4">
      <h1 className="text-2xl font-bold">Minhas solicitações</h1>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
          <TabsTrigger value="rejeitada">Rejeitadas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {(solicitacoes ?? []).length === 0 && (
          <p className="text-muted-foreground">Nenhuma solicitação.</p>
        )}
        {(solicitacoes ?? []).map((s) => {
          // Pais decide quando ele é o alvo: solicitação pendente de tipo
          // bilateral originada pelo terapeuta (RLS + RPC validam autoria
          // exata; aqui filtramos só pra não mostrar botão nas próprias).
          const podeDecidir =
            s.status === "pendente"
            && s.tipo !== "novo_cadastro"
            && s.solicitante_role === "professor";

          return (
            <Card key={s.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{TIPO_LABEL[s.tipo]}</Badge>
                <Badge className={STATUS_COLOR[s.status]}>{s.status.toUpperCase()}</Badge>
              </div>
              <div className="font-medium">{s.aluno?.nome ?? "—"}</div>
              <SolicitacaoDescricao tipo={s.tipo} payload={s.payload} />
              {s.solicitante_nome && s.solicitante_role === "professor" && (
                <p className="text-xs text-muted-foreground">
                  Proposto por <strong>{s.solicitante_nome}</strong> (terapeuta)
                </p>
              )}
              {s.status === "rejeitada" && s.motivo_rejeicao && (
                <p className="text-sm text-red-700 mt-2">
                  <strong>Motivo:</strong> {s.motivo_rejeicao}
                </p>
              )}
              <div className="text-xs text-muted-foreground">
                {new Date(s.criado_em).toLocaleString("pt-BR")}
                {s.decidido_em && ` • decidido em ${new Date(s.decidido_em).toLocaleString("pt-BR")}`}
              </div>

              {podeDecidir && (
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
          );
        })}
      </div>

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
          recorrencia_id={impactando.alvo_id ?? ""}
          aluno_nome={impactando.aluno?.nome ?? "—"}
          atual={{
            dia_semana: (impactando.payload as any).dia_semana_atual,
            horario: (impactando.payload as any).horario_atual,
          }}
          novo={{
            dia_semana: (impactando.payload as any).dia_semana_novo,
            horario: (impactando.payload as any).horario_novo,
          }}
        />
      )}
    </div>
  );
}

function SolicitacaoDescricao({ tipo, payload }: { tipo: string; payload: any }) {
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
  if (tipo === "nova_recorrencia") {
    return (
      <div className="text-sm">
        Proposta: <strong>{DIAS[payload.dia_semana]} {payload.horario}</strong>
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Cadastro de novo praticante</div>;
}
