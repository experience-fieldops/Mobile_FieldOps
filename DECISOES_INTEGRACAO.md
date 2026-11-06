# Decisões de Integração (Mobile_FieldOps)

> Registro das decisões de **design/produto** tomadas durante a integração do
> app com o backend, módulo a módulo. Serve para você localizar depois *o que*
> foi decidido, *por quê*, e o que ficou em aberto.
>
> Relacionados:
> - [`INTEGRACAO.md`](./INTEGRACAO.md) — análise de compatibilidade (divergências D-xx).
> - [`INTEGRACAO_MODULOS.md`](./INTEGRACAO_MODULOS.md) — plano de módulos.
> - [`BACKEND_MELHORIAS.md`](./BACKEND_MELHORIAS.md) — ajustes pedidos ao backend (B-xx).

---

## Convenções gerais (todos os módulos)

- **Git:** uma branch por módulo (`feat/integracao-m{N}-{card}-{slug}`), encadeada
  sobre a branch do módulo anterior. Commits em Conventional Commits. Push só
  após aprovação.
- **Validação:** cada módulo passa por `tsc --noEmit`, `eslint` e `prettier`
  (projeto usa LF; o prettier reformata — às vezes infla o diff da tela).
- **Limitação de teste:** a validação é estática (type-check/lint). O
  comportamento real (rede, GPS, câmera) só se confirma rodando no device com o
  backend no ar.
- **Padrão de tela integrada:** `useAuth()` para `user`/`token`, estados de
  `loading`/`erro`/`vazio`, recarga ao focar (`useFocusEffect`) e pull-to-refresh
  onde faz sentido.

---

## M1 — Tipos e mapeamento

- **View models separados do backend.** As telas consomem tipos de UI
  (`Inspection`, `ChecklistItem`…) e a conversão fica em `data/mappers.ts`.
  Motivo: desacoplar a UI do contrato da API.
- **ID numérico.** `inspectionId` padronizado como `number` (era `string`).
- **Campos sem origem no backend** (prioridade, progresso, código, tempo
  estimado) recebem valor derivado/padrão com `TODO(D-06)`. Ver B-02/B-04/B-05.
- **Mocks** mantidos vazios e `@deprecated` só para compilar até cada tela ser
  integrada.

## M2 — Lista de inspeções

- **"Atrasada"/"Devolvida" derivados.** Não são status nativos do backend;
  "Atrasada" = prazo vencido + não finalizada (D-14); "Devolvida" = `REJECTED`.
- **Prioridade padrão `Média`** até o backend expor o campo (B-02).

## M3 — Detalhe da inspeção

- **Progresso real** vem de `GET /inspections/{id}/responses/progress`, com
  `try/catch` próprio: se esse endpoint falhar, a tela ainda mostra o detalhe
  (progresso 0) em vez de quebrar.

## M4 — Execução de checklist

- **Execução ONLINE.** Iniciar/responder/finalizar chamam a API direto
  (exige conexão). Não há fila offline. (Consequência: ver M7/B-11.)
- **GPS obrigatório.** Instalado `expo-location`; a execução inicia capturando a
  coordenada (exigida por `StartExecutionRequest`). Permissão negada → erro.
- **Valor de item CONFORMITY = rótulo PT literal** (`"Conforme"`…), pois o
  backend aceita string livre. Isolado em `conformityToValue()` com `TODO(D-07)`.
  Pendente de enum oficial (B-01).
- **Tipos de input mapeados** de `responseType` (TEXT_SHORT/LONG→TEXT,
  SINGLE_CHOICE→CHOICE). PHOTO não é responseType — é evidência (M5).

## M5 — Evidências e não conformidades

- **Autorização para mexer na tela** → fiz o fluxo correto (não o workaround):
  no submit, cada item salva a resposta, captura o `responseId` e vincula a
  evidência a ele; se Inconforme, cria a NC e vincula também.
- **Mini-seletor de severidade** adicionado à UI (Baixa/Média/Alta/Crítica),
  default `Média` → `MEDIUM`. Backend pode querer derivar a severidade (B-10).
- **Multipart** habilitado no cliente HTTP (`services/api.ts` não força JSON
  quando o body é `FormData`).

## M6 — QR Scanner

- **Validação simples.** O QR resolve o equipamento (`.../equipments/qrcode/...`)
  e verifica se existe e está `ACTIVE`; então segue para a execução.
- **Sem verificação estrita** de que o QR bate com o `equipmentId` *daquela*
  inspeção. Pode ser adicionada se o backend/produto exigir.

## M7 — Sincronização (parcial, opção pragmática)

- **Entregue:** download real (`GET /my-orders/pending-sync`) para a fila; seções
  "Enviadas"/"Aprovadas" derivadas do `status` das inspeições do técnico
  (`COMPLETED`/`UNDER_REVIEW` → enviadas; `APPROVED` → aprovadas).
- **NÃO entregue:** fila de upload offline (`POST /sync`). Motivo: a execução é
  online (M4/M5) e implementar a fila refatora módulos já entregues — é um épico
  próprio. `pushSync` fica tipado e pronto. Ver B-11.

## M8 — Equipamentos

- **Sites derivados das inspeções.** Como não há endpoint "todos os
  equipamentos" (só `GET /sites/{siteId}/equipments`) e o app não tem navegação
  cliente→site, a `EquipmentScreen` extrai os sites distintos das inspeções
  atribuídas ao técnico (`getAssignedInspections`) e lista os equipamentos de
  cada um, **agrupados por site**.
- **Alternativa não feita:** catálogo completo via seleção cliente→site
  (`GET /clients` → `/clients/{id}/sites`). Fica como evolução futura se for
  preciso ver equipamentos além dos sites das inspeções do técnico.

---

## Itens em aberto que dependem do backend

| Ref | Assunto | Onde está |
|---|---|---|
| B-01 / D-07 | Enum oficial de conformidade (valor de `value`) | BACKEND_MELHORIAS.md |
| B-02 / D-06 | Prioridade da inspeção | BACKEND_MELHORIAS.md |
| B-10 | Severidade/`evidenceAttached`/título da NC | BACKEND_MELHORIAS.md |
| B-11 | Fila de upload offline (épico) | BACKEND_MELHORIAS.md |
| B-06 / B-07 | Organização e métricas do usuário (M9) | BACKEND_MELHORIAS.md |

---

*Documento vivo — atualizar a cada módulo ou quando uma decisão for revista.*
