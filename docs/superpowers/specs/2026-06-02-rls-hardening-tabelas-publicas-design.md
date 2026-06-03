# RLS Hardening — Tabelas Públicas sem RLS — Design

**Data:** 2026-06-02
**Status:** Aprovado para planejamento

## Problema

O Supabase Advisor sinaliza **CRITICAL: "RLS Disabled in Public"** em ~5 tabelas. Tabela pública sem RLS = exposta na API (PostgREST) com a *anon key* (que vai embutida no frontend, visível por qualquer pessoa) e **sem nenhuma trava de linha** → qualquer um na internet pode ler/inserir/alterar/apagar todas as linhas. Tabelas envolvidas contêm dados sensíveis (vínculos criança↔responsável, PII de responsáveis, notificações), o que agrava o risco sob LGPD.

## Restrição inegociável

**NÃO pode quebrar nada no app.** Esta é a prioridade nº 1, acima de fechar todos os alertas. Em caso de qualquer dúvida sobre quebra, a tabela fica de fora desta rodada.

## Estratégia escolhida (mínima — fechar anon, manter autenticado aberto)

Por tabela:
```sql
ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<t>_authenticated_all" ON public.<t>
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

**Por que não quebra:** a policy permite a `authenticated` fazer **tudo** o que já faz hoje — não remove nenhuma permissão de quem está logado. A única coisa que perde acesso é o papel `anon` (não logado). Como o app inteiro fica atrás de login, ninguém anônimo usa essas tabelas (exceto o caso do cadastro — tratado abaixo). Resultado: fecha o buraco anônimo, zera o alerta CRITICAL, e o uso logado continua idêntico.

O RPC `enviar_comunicado` é `SECURITY DEFINER` → escrita em `avisos`/`notificacoes` por ele continua funcionando independentemente do RLS.

**Decisão consciente:** esta abordagem NÃO separa por papel (qualquer autenticado lê/escreve). Isso é aceito de propósito para minimizar risco. Endurecimento por papel (pais vê só os próprios filhos etc.) fica como trabalho futuro separado. Ver [[project_rls_posture]].

## Pré-checagem obrigatória (garantia anti-quebra)

Antes de tocar qualquer tabela, confirmar no código que ela **não é acessada antes do login**. Resultado da varredura (`grep from('<t>')` em `src/`):

- **100% pós-login (seguras nesta rodada):** `notificacoes`, `avisos`, `aluno_conquistas` (nem é lida no front), `mural_comentarios`, `mural_likes`, `mural_posts`.
- **Acessadas no cadastro (`Login.tsx`, fluxo de `signUp` de pais, linhas ~189-313):** `responsaveis`, `aluno_responsavel`.

## Escopo desta rodada

**Incluídas** (aplicar o padrão acima, uma por vez, só nas que estiverem mesmo com RLS off no banco real):
`notificacoes`, `avisos`, `aluno_conquistas`, `mural_comentarios`, `mural_likes`, `mural_posts`.

**Excluídas desta rodada** (deliberadamente):
`responsaveis`, `aluno_responsavel`. Motivo: são lidas/escritas no `signUp` de pais. Há indício forte de que o cadastro roda autenticado (comentário em `Login.tsx`: "não há mais email de confirmação" ⇒ `autoconfirm` ligado ⇒ `signUp` já cria sessão), mas isso precisa ser **confirmado** (config de Auth) antes de ligar RLS nelas. Enquanto não confirmado, ficam off para não arriscar quebrar o cadastro. Tratadas numa 2ª rodada.

## Procedimento de aplicação (1 tabela por vez)

1. Confirmar (diagnóstico no banco real) quais tabelas-alvo estão de fato com RLS off e quais policies já existem.
2. Para cada tabela incluída, na ordem: aplicar a migration → o usuário testa o app no papel relevante → só seguir para a próxima se ok.
3. Cada migration acompanha seu **rollback de 1 linha**: `ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;` — reverte instantaneamente ao estado atual.
4. Ao final, rodar o Advisor de novo → os alertas das tabelas incluídas devem sumir.

## Quem aplica

O agente **prepara** as migrations + rollbacks e as commita. A aplicação no banco é feita pelo usuário no SQL Editor, **ou** o agente aplica via Management API com um PAT fornecido na hora — sempre **uma por vez, com teste do app entre cada**. Diagnóstico do estado real e config de Auth: ver [[reference_supabase_validation]].

## Fora de escopo (YAGNI)

- Endurecimento por papel (pais/professor/gestor) — trabalho futuro.
- `responsaveis` / `aluno_responsavel` (2ª rodada, após confirmar autoconfirm).
- Corrigir a brecha de delete sem dono em `mural_comentarios` (é outra questão; aqui só ligamos RLS sem mudar comportamento).

## Plano de testes (por tabela incluída)

- `notificacoes`: logado, abrir sino/notificações → carregam; marcar como lida funciona.
- `avisos`: logado, lista de avisos/comunicados carrega; gestor consegue enviar comunicado (RPC).
- `aluno_conquistas`: nenhuma tela quebra (não é lida no front); conquistas continuam sendo gravadas pelo backend.
- `mural_*`: abrir o mural → posts, comentários e likes carregam; criar post/comentário/like funciona.
- Geral: **cadastro de pais (`signUp`) continua funcionando** (sanidade — as tabelas do cadastro ficaram de fora, mas vale reconfirmar que nada regrediu).
- Advisor: alertas das tabelas incluídas somem.
