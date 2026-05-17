// src/components/pais/PaisSolicitacoes.tsx
import { useState } from "react";
import { useSolicitacoes, type SolicitacaoStatus } from "@/hooks/useSolicitacoes";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIPO_LABEL: Record<string, string> = {
  novo_cadastro: "Novo cadastro",
  mudanca_recorrencia: "Mudança de horário",
  remarcacao_sessao: "Remarcação avulsa",
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

  if (isLoading) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-4 space-y-4">
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
        {(solicitacoes ?? []).map((s) => (
          <Card key={s.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{TIPO_LABEL[s.tipo]}</Badge>
              <Badge className={STATUS_COLOR[s.status]}>{s.status.toUpperCase()}</Badge>
            </div>
            <div className="font-medium">{s.aluno?.nome ?? "—"}</div>
            <SolicitacaoDescricao tipo={s.tipo} payload={s.payload} />
            {s.status === "rejeitada" && s.motivo_rejeicao && (
              <p className="text-sm text-red-700 mt-2">
                <strong>Motivo:</strong> {s.motivo_rejeicao}
              </p>
            )}
            <div className="text-xs text-muted-foreground">
              {new Date(s.criado_em).toLocaleString("pt-BR")}
              {s.decidido_em && ` • decidido em ${new Date(s.decidido_em).toLocaleString("pt-BR")}`}
            </div>
          </Card>
        ))}
      </div>
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
  return <div className="text-sm text-muted-foreground">Cadastro de novo praticante</div>;
}
