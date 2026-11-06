# Melhorias necessárias no Backend (FieldOps API)

> Lista de ajustes no backend identificados durante a integração do app mobile.
> Cada item traz o **problema**, o **impacto no mobile**, a **sugestão** e o **workaround atual** (o que o app faz hoje para não travar).
>
> Base: contrato OpenAPI `http://localhost:8080/v3/api-docs`. Referências `D-xx` apontam para as divergências catalogadas em [`INTEGRACAO.md`](./INTEGRACAO.md).

| # | Severidade | Tema |
|---|---|---|
| B-01 | 🔴 Alta | Enum de conformidade ausente |
| B-02 | 🟠 Média | Prioridade da inspeção inexistente |
| B-03 | 🟠 Média | Progresso/percentual já existe — confirmar semântica |
| B-04 | 🟡 Baixa | Código amigável da inspeção |
| B-05 | 🟡 Baixa | Tempo estimado da inspeção |
| B-06 | 🟡 Baixa | Organização do usuário |
| B-07 | 🟡 Baixa | Métricas do técnico |
| B-08 | 🟠 Média | `requestingUserId`/`technicianId` via query |
| B-09 | 🟡 Baixa | `BOOLEAN`/`DATE` — formato do `value` |
| B-10 | 🟠 Média | Severidade da NC definida pelo cliente |
| B-11 | 🟠 Média | Fila de upload offline não implementada no app |

---

## B-01 — Enum de conformidade (D-07) 🔴

**Problema.** O item de checklist do tipo `CONFORMITY` grava a resposta em `ChecklistResponseRequest.value`, que é **string livre**. Não há enum nem conjunto de valores aceitos documentado.

**Impacto no mobile.** A UI tem 4 respostas fixas: `Conforme`, `Atenção`, `Inconforme`, `Não verificado`. Sem um contrato, não há garantia de que o backend interprete esses valores (relatórios, regras de não conformidade, etc.).

**Sugestão.** Criar um enum no backend, por exemplo:
```
ConformityValue = CONFORMING | ATTENTION | NON_CONFORMING | NOT_VERIFIED
```
e validar `value` contra ele quando `responseType = CONFORMITY`. Expor o enum no OpenAPI.

**Workaround atual no app.** Enviamos o **rótulo PT literal** (`"Conforme"`, `"Inconforme"`…) em `value`. Está isolado em `data/mappers.ts → conformityToValue()` com `TODO(D-07)`; trocar para o enum oficial é mudança de uma função só.

---

## B-02 — Prioridade da inspeção (D-06) 🟠

**Problema.** `InspectionResponse` não tem campo de prioridade.

**Impacto.** A lista e o detalhe exibem um badge de prioridade (Alta/Média/Baixa). Hoje é sempre "Média".

**Sugestão.** Adicionar `priority` (enum `HIGH | MEDIUM | LOW`) ao `InspectionResponse`, ou esclarecer que prioridade não faz parte do domínio (e aí removemos o badge).

**Workaround atual.** `data/mappers.ts → derivePriority()` retorna `'Média'` fixo.

---

## B-03 — Progresso / percentual 🟠

**Situação.** O endpoint `GET /api/v1/inspections/{inspectionId}/responses/progress` **já existe** e retorna `InspectionProgressResponse` com `progressPercentage`, `totalItems`, `answeredItems`, etc. — ótimo.

**A confirmar.** Semântica de `progressPercentage`: é 0–100 (usamos `Math.round`)? Conta `notApplicableItems` como respondidos? O app assume 0–100 e arredonda.

**Sugestão.** Documentar a fórmula no OpenAPI (description do campo).

---

## B-04 — Código amigável da inspeção 🟡

**Problema.** Não há um código legível (ex.: `INSP-2026-001`); só o `id` numérico.

**Impacto.** A UI mostra um "código" em vários lugares.

**Workaround atual.** Derivamos `INSP-{id}` no mapper.

**Sugestão.** Se houver um código de negócio, expô-lo no `InspectionResponse`.

---

## B-05 — Tempo estimado 🟡

**Problema.** `InspectionResponse` não traz tempo estimado de execução.

**Impacto.** O modal de detalhe tem o campo "Tempo estimado"; hoje exibe "—".

**Sugestão.** Adicionar `estimatedTime`/`estimatedMinutes` se fizer parte do domínio, ou confirmar que o campo sai da UI.

---

## B-06 — Organização do usuário 🟡

**Problema.** `UserResponse` (e o login) não retornam a organização.

**Impacto.** A tela de perfil mostra "Organização"; o app usa `'FieldOps'` hardcoded.

**Sugestão.** Incluir `organization`/`tenant` no `UserResponse`, ou confirmar que não se aplica.

---

## B-07 — Métricas do técnico 🟡

**Problema.** Não há endpoint de métricas do técnico (inspeções concluídas, % de aprovação, devolvidas).

**Impacto.** A tela de perfil exibe números fixos (mock).

**Sugestão.** Criar algo como `GET /api/v1/technicians/{id}/metrics`, ou deixaremos a UI derivar client-side via listagens (menos eficiente).

---

## B-08 — `requestingUserId` / `technicianId` na query 🟠

**Problema.** Vários endpoints exigem o id do usuário na **query string** (`?requestingUserId=`, `?technicianId=`), mesmo já havendo um JWT autenticado que identifica o usuário.

**Endpoints afetados.** `POST /inspections/{id}/executions`, `POST /executions/{id}/responses`, `PATCH /executions/{id}/complete|pause`, `GET /inspections/assigned`, `POST /api/v1/sync`, etc.

**Impacto.** Redundância e risco: o cliente poderia enviar um id diferente do dono do token. O app usa `user.id` do token, mas o backend não deveria confiar nesse parâmetro.

**Sugestão.** Derivar o usuário do próprio JWT no backend e tornar esses parâmetros desnecessários (ou ignorá-los/validar que batem com o token).

---

## B-09 — Formato do `value` para BOOLEAN e DATE 🟡

**Problema.** `value` é string livre também para itens `BOOLEAN` e `DATE`; o formato esperado não está documentado.

**Impacto.** O app envia `BOOLEAN` como `"true"`/`"false"` e `DATE` como o texto digitado (máscara `dd/mm/aaaa`). Pode não bater com o parser do backend.

**Sugestão.** Documentar o formato esperado por `responseType` (ex.: BOOLEAN = `"true"|"false"`, DATE = ISO `yyyy-mm-dd`). Se for ISO, o app precisa converter a máscara antes de enviar.

---

## B-10 — Severidade da não conformidade definida pelo cliente 🟠

**Situação.** Ao marcar um item como `Inconforme`, o app abre uma NC via
`POST /inspections/{id}/non-conformities` com `severity` (LOW/MEDIUM/HIGH/CRITICAL).
Hoje a severidade é **escolhida pelo técnico** na tela (mini-seletor), com
default `MEDIUM` quando não selecionada.

**Pontos a confirmar com o backend.**
- Existe regra de negócio que **derive** a severidade (ex.: do tipo do item),
  tornando a escolha do técnico desnecessária ou apenas sugestiva?
- O campo `evidenceAttached` do `NonConformityRequest` deve ser calculado pelo
  backend (a partir das evidências realmente enviadas) em vez de informado pelo
  cliente? Hoje o app envia `evidenceAttached` com base nas fotos locais, o que
  pode divergir do que de fato subiu.
- `title` da NC: o app usa o título do item do checklist. Confirmar se é
  aceitável ou se deve haver um título próprio.

**Impacto.** Sem alinhamento, severidade e `evidenceAttached` podem ficar
inconsistentes entre app e backend.

---

## B-11 — Fila de upload offline não implementada no app (M7) 🟠

**Situação.** O backend oferece `POST /api/v1/sync` para receber um **lote de
operações offline** (`START_INSPECTION`, `SAVE_RESPONSE`, `UPLOAD_EVIDENCE`,
`COMPLETE_INSPECTION`…), cada uma com `idempotencyKey` e `payload`. Isso
pressupõe que o app **acumule operações localmente sem internet** e as envie
depois.

**Conflito com o app atual.** A execução (M4/M5) grava **online**: a
`ChecklistExecutionScreen` chama `startExecution`, `saveResponse`,
`uploadEvidence` e `completeExecution` direto nos endpoints REST, exigindo
conexão no momento. **Não existe fila local.** Portanto o `POST /sync` não é
acionado pela UI hoje.

**O que o M7 entregou (opção pragmática).**
- **Download offline:** `GET /my-orders/pending-sync` alimenta a seção "Fila
  para sincronização" (ordens disponíveis).
- **Enviadas/Aprovadas:** derivadas do `status` das inspeções do técnico
  (`COMPLETED`/`UNDER_REVIEW` → enviadas; `APPROVED` → aprovadas).
- `services/syncService.ts` já traz `pushSync` **tipado e pronto**, mas não
  acionado pela tela.

**Trabalho futuro (fora do M7).** Implementar a fila offline de verdade exige:
1. Persistir operações localmente (ex.: AsyncStorage) quando sem rede.
2. Refatorar a execução (M4/M5) para enfileirar em vez de chamar a API direto.
3. Drenar a fila via `POST /api/v1/sync`, tratando `idempotencyKey`,
   `SyncItemResult` (SUCCESS/FAILED/SKIPPED) e reprocessamento dos que falharam.

Este é um épico próprio (mexe em módulos já entregues) e foi deliberadamente
adiado para não misturar refatoração com a entrega do M7.

---

*Documento vivo — atualizar conforme o backend evolui ou novas divergências surgirem na integração.*
