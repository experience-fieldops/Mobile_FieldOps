# Plano de Integração em Módulos — Mobile_FieldOps

> Companheiro do [`INTEGRACAO.md`](./INTEGRACAO.md). Enquanto aquele documento é a **análise** (o que diverge e por quê), este é o **plano de execução**: quebra a integração em módulos pequenos, versionáveis e independentes, pensados para virar **branches + PRs + commits** limpos.
>
> **Como usar este documento:** cada módulo abaixo é um prompt de trabalho. Quando formos desenvolver, você diz "vamos no M1" e usamos a seção correspondente (escopo, arquivos, critérios de aceite) como contrato da tarefa. As referências `D-xx` apontam para as divergências catalogadas no `INTEGRACAO.md`.
>
> Status legível: `[ ]` não iniciado · `[~]` em andamento · `[x]` concluído.

---

## Mapa de dependências

```
M0  Fundação HTTP/config ──┬─→ M1 Camada de tipos & mapeamento ──┬─→ M2 Lista de inspeções
                           │                                      ├─→ M3 Detalhe da inspeção
                           │                                      └─→ M4 Execução de checklist ──→ M5 Evidências & não conformidades
                           └─────────────────────────────────────────→ M6 QR Scanner
M0 ───────────────────────────────────────────────────────────────────→ M7 Sincronização offline
M1 ───────────────────────────────────────────────────────────────────→ M8 Equipamentos
M0 ───────────────────────────────────────────────────────────────────→ M9 Perfil & métricas
```

Regra de ouro: **M0 e M1 vêm primeiro**. Eles desbloqueiam todo o resto e não dependem de decisões de produto. Do M2 em diante, cada módulo é uma vertical de tela que pode ser feita e revisada isoladamente.

---

## Convenção de branches e commits

- **Branch por módulo:** `feat/integracao-m0-fundacao-http`, `feat/integracao-m2-lista-inspecoes`, etc.
- **Commits (Conventional Commits):**
  - `feat(api): unifica cliente HTTP numa única fonte de base URL`
  - `fix(users): envia token Bearer no userService`
  - `refactor(inspections): mapeia BackendInspection para view model da UI`
  - `chore(types): tipa itemSnapshots com InspectionItemSnapshotResponse`
- **Um módulo = um PR.** Submódulos viram commits separados dentro do mesmo PR.
- **Ordem de merge:** seguir o mapa de dependências (M0 → M1 → verticais).

---

## M0 — Fundação HTTP e configuração  `[x]`

**Objetivo:** ter um único cliente HTTP autenticado e uma única fonte de base URL antes de qualquer tela tocar na rede.

**Resolve:** D-03 (URL divergente), D-04 (userService sem token), D-13 (clientes duplicados).

**Escopo**
- Unificar `api.ts` (raiz) e `services/api.ts` num só cliente. Decidir qual fica e remover o outro.
- Base URL a partir de uma única fonte (`EXPO_PUBLIC_API_URL` via `.env.local`). Aposentar o valor hardcoded de `config/api.ts`.
- Fazer `userService.ts` passar pelo cliente autenticado (enviar `Authorization: Bearer`).
- Garantir leitura consistente do envelope `ApiResponse<T>` e do `Page<T>`.

**Arquivos**
- `api.ts`, `services/api.ts`, `config/api.ts`, `services/userService.ts`, `.env.local`

**Fora de escopo:** qualquer mudança de tela.

**Critérios de aceite**
- Existe só um cliente HTTP; imports atualizados em todo o projeto.
- Nenhuma URL de API hardcoded fora da config central.
- `userService` envia token e não quebra em `/api/user` (401/403 eliminado).
- `npx tsc --noEmit` não introduz novos erros.

**Commits sugeridos**
1. `refactor(api): consolida cliente HTTP único`
2. `fix(config): base URL a partir de EXPO_PUBLIC_API_URL`
3. `fix(users): autentica chamadas do userService`

---

## M1 — Camada de tipos e mapeamento  `[x]`

**Objetivo:** criar os *view models* da UI e as funções que convertem os DTOs do backend para eles. É o módulo que derruba o build quebrado.

**Resolve:** D-01 (exports perdidos), D-02 (ID string→number), D-10 (`itemSnapshots` tipado), e prepara D-06/D-07/D-08/D-14.

**Escopo**
- Definir os tipos de UI que as telas esperam (ex.: `Inspection`, `Priority`, `InspectionStatus` de UI, `ChecklistItem`, `ChecklistAnswer`, `ChecklistEvidence`).
- Criar funções de mapeamento `BackendInspection → Inspection(UI)`, incluindo:
  - status EN → rótulo PT + estado derivado "Atrasada" (D-14);
  - `templateTitle`→título, `assignedToName`→responsável, `equipmentName`→equipamento, `siteName`→área/local (D-06).
- Tipar `itemSnapshots` com `InspectionItemSnapshotResponse` (D-10).
- Padronizar `inspectionId` como `number` no `RootStackParamList` (D-02).
- Marcar explicitamente (comentário/TODO) os campos sem origem no backend que dependem de decisão de produto: `priority`, `progress`, `estimatedTime` (ver seção "Decisões pendentes").

**Arquivos**
- `data/inspections.ts` (reescrever exports de UI), `types/inspectionApi.ts`, `navigation/AppNavigator.tsx`, e um novo `mappers/` ou `data/mappers.ts` (a definir).

**Critérios de aceite**
- As 5 telas quebradas voltam a compilar (sem mudar a lógica de UI delas ainda).
- Mapeamento coberto por ao menos um teste unitário (se houver runner) ou por exemplo documentado.
- Nenhum `MOCK_*` referenciado por telas que serão integradas (mocks restantes ficam isolados/sinalizados).

**Commits sugeridos**
1. `feat(types): view models de inspeção e checklist`
2. `feat(mappers): converte BackendInspection para o modelo da UI`
3. `chore(types): tipa itemSnapshots e padroniza ID numérico`

---

## M2 — Lista de inspeções  `[x]`

**Objetivo:** `InspectionsScreen` consumindo dados reais.

**Depende de:** M0, M1. **Resolve na prática:** D-06, D-14 aplicados à listagem.

**Escopo**
- Trocar `MOCK_INSPECTIONS` por `getAssignedInspections(token, user.id)` (service já compatível).
- Estados de carregando / vazio / erro.
- Filtros por status mapeando para o enum do backend (ou derivação para "Atrasada"/"Devolvida").
- Contadores do topo a partir dos dados reais.

**Rota:** `GET /api/v1/inspections/assigned?technicianId&page&size`

**Arquivos:** `screens/InspectionsScreen.tsx`, `services/inspectionService.ts` (se precisar ajustar paginação).

**Critérios de aceite**
- Lista renderiza itens reais do técnico logado.
- Filtros e contadores coerentes com os dados.
- Pull-to-refresh / nova busca ao focar a tela (opcional, se combinarmos).

**Commit sugerido:** `feat(inspections): lista inspeções atribuídas do backend`

---

## M3 — Detalhe da inspeção  `[x]`

**Objetivo:** `InspectionDetailScreen` com `GET /inspections/{id}` e progresso real.

**Depende de:** M1 (M2 ajuda, mas não bloqueia).

**Escopo**
- Buscar detalhe por `id` (number).
- Mapear `siteName`→local, `equipmentName`→equipamento, status, prazo.
- Progresso via `GET /api/v1/inspections/{inspectionId}/responses/progress`.

**Rotas:** `GET /api/v1/inspections/{id}`, `GET /api/v1/inspections/{inspectionId}/responses/progress`

**Arquivos:** `screens/InspectionDetailScreen.tsx`, `services/inspectionService.ts`.

**Critérios de aceite**
- Detalhe reflete o backend; sem campos mock.
- Progresso vem do endpoint, não calculado às cegas.

**Commit sugerido:** `feat(inspections): detalhe e progresso reais`

---

## M4 — Execução de checklist (fluxo crítico)  `[x]`

**Objetivo:** `ChecklistExecutionScreen` persistindo execução e respostas.

**Depende de:** M1. **Resolve:** D-07, D-08, D-09.

**Escopo**
- Iniciar execução: `POST /inspections/{inspectionId}/executions?requestingUserId` com GPS obrigatório (integrar `expo-location`, D-09).
- Carregar itens do `itemSnapshots` do detalhe.
- Gravar resposta por item: `POST /executions/{executionId}/responses` com `snapshotItemId`, `value`, `observation`, `notApplicable`, GPS.
- Mapear `responseType` backend → inputs da UI (D-08) e valores de conformidade (D-07, depende de decisão).
- Finalizar: `PATCH /executions/{executionId}/complete`. Pausar: `PATCH /executions/{executionId}/pause`.

**Rotas:** execuções + responses (ver `INTEGRACAO.md` §4.5).

**Arquivos:** `screens/ChecklistExecutionScreen.tsx`, `screens/InspectionFormScreen.tsx` (se mantida), novo `services/executionService.ts`.

**Critérios de aceite**
- Execução inicia com GPS e retorna `executionId`.
- Cada item salvo individualmente contra o backend.
- Finalização muda o estado no backend.
- Itens obrigatórios bloqueiam avanço (regra de UI já existe).

**Commits sugeridos**
1. `feat(execution): inicia execução com GPS`
2. `feat(execution): grava respostas do checklist por item`
3. `feat(execution): finaliza e pausa execução`

---

## M5 — Evidências e não conformidades  `[x]`

**Objetivo:** anexar fotos e registrar não conformidades durante a execução.

**Depende de:** M4.

**Escopo**
- Upload de foto: `POST /inspections/{id}/evidences?uploadedByUserId` (**multipart/form-data**, campo `file`, opcional `responseId`/`nonConformityId`).
- Tratar foto como **recurso de evidência**, não como `responseType PHOTO` (D-08).
- Não conformidade: `POST /inspections/{id}/non-conformities` (`title`, `severity` LOW/MEDIUM/HIGH/CRITICAL, `snapshotItemId`).
- Respeitar `evidenceRequiredOnFailure`/`observationRequiredOnFailure` dos snapshots.

**Arquivos:** `screens/ChecklistExecutionScreen.tsx`, novo `services/evidenceService.ts`, `services/nonConformityService.ts`.

**Critérios de aceite**
- Foto sobe via multipart e vincula à resposta/NC correta.
- NC criada quando item é inconforme, com severidade.

**Commits sugeridos**
1. `feat(evidence): upload multipart de fotos`
2. `feat(nonconformity): registra não conformidade na execução`

---

## M6 — QR Scanner  `[x]`

**Objetivo:** `QRScannerScreen` resolvendo o QR contra o backend.

**Depende de:** M0.

**Escopo**
- Trocar casamento com `MOCK_CHECKLIST` por `GET /api/v1/equipments/qrcode/{qrCode}`.
- Tratar equipamento não encontrado / inativo (`status`).
- Decidir a navegação pós-leitura (abrir inspeção/execução do equipamento).

**Rota:** `GET /api/v1/equipments/qrcode/{qrCode}`

**Arquivos:** `screens/QRScannerScreen.tsx`, novo `services/equipmentService.ts`.

**Critérios de aceite**
- QR válido resolve equipamento real; inválido mostra erro claro.

**Commit sugerido:** `feat(qr): resolve equipamento por QR code no backend`

---

## M7 — Sincronização offline  `[~]` (parcial — opção pragmática)

> **Status (entregue):** download real (`pending-sync`) + seções
> "enviadas/aprovadas" derivadas do status das inspeções. A **fila de upload
> offline NÃO foi implementada** porque a execução (M4/M5) grava online e não
> há fila local — implementar a fila é um épico que refatora módulos já
> entregues. Ver `BACKEND_MELHORIAS.md` B-11. O `pushSync` já está tipado no
> `syncService` para quando a fila existir.

**Objetivo:** `SyncScreen` com download e upload reais.

**Depende de:** M0 (idealmente após M4, pois sincroniza operações de execução). **Resolve:** D-11.

**Escopo**
- Download offline: `GET /api/v1/my-orders/pending-sync?technicianId`.
- Upload de lote: `POST /api/v1/sync?technicianId` com `operations[]` (idempotencyKey, operationType, payload).
- Status por inspeção: `GET /api/v1/inspections/{id}/sync-status`.
- Derivar os baldes "pendente/enviada/aprovada" da UI (não há endpoint 1:1).
- Fila local de operações offline (estratégia de armazenamento a definir).

**Rotas:** ver `INTEGRACAO.md` §4.7.

**Arquivos:** `screens/SyncScreen.tsx`, novo `services/syncService.ts`.

**Critérios de aceite**
- Download popula trabalho offline.
- Upload envia o lote e reflete `SUCCESS/PARTIAL/FAILED`.
- Estados da UI derivados de dados reais.

**Commits sugeridos**
1. `feat(sync): download de ordens para offline`
2. `feat(sync): upload de lote de operações`
3. `feat(sync): deriva estados de sincronização na UI`

---

## M8 — Equipamentos  `[x]`

**Objetivo:** `EquipmentScreen` (hoje placeholder) listando equipamentos.

**Depende de:** M1.

**Escopo**
- Listagem: `GET /api/v1/sites/{siteId}/equipments` (paginado, filtros `name`/`status`).
- Detalhe: `GET /api/v1/equipments/{id}`.
- Definir como a tela recebe o `siteId` (navegação/seleção).

**Arquivos:** `screens/EquipmentScreen.tsx`, `services/equipmentService.ts` (compartilhado com M6).

**Critérios de aceite:** tela lista equipamentos reais com filtro por status.

**Commit sugerido:** `feat(equipment): lista equipamentos por site`

---

## M9 — Perfil e métricas  `[x]`

**Objetivo:** `ProfileScreen` sem dados fabricados.

**Depende de:** M0. **Resolve:** D-05, D-12.

**Escopo**
- Remover/definir `organization` (hoje hardcoded, sem origem no backend — D-05).
- Rótulo amigável para `role`.
- Métricas ("concluídas", "% aprovação", "devolvidas"): **bloqueado** por decisão — não há endpoint. Ou backend cria, ou derivamos client-side via listagens.

**Arquivos:** `screens/ProfileScreen.tsx`, `context/AuthContext.tsx`.

**Critérios de aceite:** nenhuma métrica mock exibida como se fosse real; `organization` tratado.

**Commit sugerido:** `feat(profile): dados reais e tratamento de métricas`

---

## Decisões pendentes (bloqueiam alguns módulos)

Estas precisam de resposta do time de backend/produto antes de fechar os módulos indicados. Detalhadas na §8 do `INTEGRACAO.md`.

| Decisão | Bloqueia | Pergunta |
|---|---|---|
| Prioridade da inspeção | M1, M2 | `priority` vai existir no `InspectionResponse`? Senão, exibimos sem prioridade? |
| Valores de conformidade | M4 | Qual `value` usar para itens `CONFORMITY`? Há enum canônico? |
| Métricas do técnico | M9 | Haverá endpoint de métricas ou derivamos no app? |
| `organization` | M9 | App deve exibir organização? De onde vem? |
| `estimatedTime` | M1, M2 | Campo some da UI ou backend passa a enviar? |

---

## Sequência recomendada de PRs

1. **M0** — fundação (sem dependência de decisão). ✅ pode começar já.
2. **M1** — tipos & mapeamento (destrava o build). ✅ pode começar já (com TODOs nos campos pendentes).
3. **M2** e **M3** — listagem e detalhe.
4. **M4** → **M5** — execução e evidências (núcleo do produto).
5. **M6** — QR.
6. **M7** — sincronização.
7. **M8**, **M9** — telas secundárias.

---

*Este plano deriva do `INTEGRACAO.md`. Ao concluir cada módulo, atualize o status `[ ]→[x]` e registre decisões tomadas na tabela de pendências.*
