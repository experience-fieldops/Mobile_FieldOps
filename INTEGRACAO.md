# Análise de Integração Mobile ↔ Backend (FieldOps)

> Documento de referência para a integração do app **Mobile_FieldOps** (Expo / React Native) com a **FieldOps API** (Spring Boot).
> A **base da verdade é o backend**: sempre que o mobile divergir do contrato OpenAPI, o mobile é que deve se adaptar.
>
> - Fonte: OpenAPI `GET http://localhost:8080/v3/api-docs` (OpenAPI 3.1.0, título "FieldOps API", versão `v1`).
> - Backend analisado: **52 rotas**, **98 schemas**.
> - Escopo: todas as telas do app + services/types atuais.
> - Status: **somente análise**. Nenhum código foi alterado.

---

## 1. Convenções do backend (valem para todas as telas)

Antes das telas, os pontos globais que afetam praticamente toda a integração:

### 1.1. Envelope de resposta `ApiResponse<T>`
Quase todos os endpoints `/api/v1/**` retornam um envelope, **não** o objeto direto:

```jsonc
{
  "data": { /* o objeto ou Page de verdade */ },
  "message": "string",
  "timestamp": "2026-11-03T12:00:00Z"
}
```

Implicação: todo acesso precisa ler `response.data` (e, para listas paginadas, `response.data.content`). O `inspectionService` já faz isso corretamente.

### 1.2. Paginação (`Page<T>`)
Endpoints de listagem retornam:

```jsonc
{
  "content": [ /* itens */ ],
  "totalElements": 0, "totalPages": 0,
  "number": 0, "size": 20,
  "first": true, "last": true, "empty": true,
  "numberOfElements": 0, "sort": {}, "pageable": {}
}
```

Parâmetros de query: `page` (0-based), `size` (≥1), `sort`.

### 1.3. Autenticação
- `POST /api/auth/login` e `POST /api/auth/register` são **públicos** (sem `bearerAuth`).
- **Todo o resto exige** `Authorization: Bearer <token>` (security global `bearerAuth`).
- `LoginResponse.expiresIn` está em **milissegundos** (o `AuthContext` já trata como ms — correto).

### 1.4. Prefixo de versão
- Autenticação e usuários: **sem** `/v1` → `/api/auth/*`, `/api/user/*`.
- Domínio de inspeção/equipamento/sync: **com** `/v1` → `/api/v1/*`.

### 1.5. Tipos de ID
No backend **todos os IDs são `int64` (number)**. O mobile declara `inspectionId: string` no `RootStackParamList`. Veja [divergência D-02](#6-divergências-e-pendências-consolidadas).

### 1.6. Enums (idioma)
O backend usa **enums em inglês**. A UI exibe rótulos em português. Toda a tradução de rótulo precisa de uma camada de mapeamento no mobile.

| Domínio | Valores backend |
|---|---|
| `InspectionStatus` | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `CANCELLED` |
| `ExecutionStatus` | `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `CANCELLED` |
| `responseType` (item) | `TEXT_SHORT`, `TEXT_LONG`, `NUMBER`, `BOOLEAN`, `CONFORMITY`, `SINGLE_CHOICE`, `DATE` |
| `EquipmentStatus` | `ACTIVE`, `INACTIVE`, `DECOMMISSIONED` |
| `NonConformitySeverity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `role` (usuário) | `ADMIN`, `SUPERVISOR`, `TECNICO` |

---

## 2. Visão geral por tela

| Tela | Integra hoje? | Compila? | Rota(s) backend principal(is) |
|---|---|---|---|
| LoginScreen | ✅ Sim (real) | ✅ | `POST /api/auth/login` |
| InspectionsScreen | ❌ Mock + imports quebrados | ❌ | `GET /api/v1/inspections/assigned` |
| InspectionDetailScreen | ❌ Mock + imports quebrados | ❌ | `GET /api/v1/inspections/{id}` |
| InspectionFormScreen | ❌ Mock + imports quebrados | ❌ | `.../executions/{executionId}/responses` |
| ChecklistExecutionScreen | ❌ Mock + imports quebrados | ❌ | execuções + responses + evidences |
| QRScannerScreen | ❌ Mock + imports quebrados | ❌ | `GET /api/v1/equipments/qrcode/{qrCode}` |
| SyncScreen | ❌ 100% mock | ✅ | `POST /api/v1/sync`, `GET /api/v1/my-orders/pending-sync` |
| ProfileScreen | ⚠️ Parcial (user real, stats mock) | ✅ | (sem endpoint de métricas) |
| DashboardScreen | ⛔ Placeholder vazio | ✅ | — |
| EquipmentScreen | ⛔ Placeholder vazio | ✅ | `GET /api/v1/sites/{siteId}/equipments` |

> **Causa raiz dominante:** `data/inspections.ts` foi substituído pelo modelo do backend (`BackendInspection`/`BackendInspectionStatus`) e **perdeu** os exports que a UI usa: `MOCK_INSPECTIONS`, `MOCK_CHECKLIST`, `Inspection`, `InspectionStatus`, `Priority`, `ChecklistItem`, `ChecklistAnswer`, `ChecklistEvidence`. Isso quebra 5 telas em tempo de compilação.

---

## 3. Services e configuração atuais

### 3.1. Clientes HTTP duplicados e URL divergente ⚠️
Há **três** formas de obter a base da API no projeto, e elas **não concordam**:

| Arquivo | Base URL | Envia `Authorization`? |
|---|---|---|
| `api.ts` (raiz) | `process.env.EXPO_PUBLIC_API_URL` | ✅ |
| `services/api.ts` | `process.env.EXPO_PUBLIC_API_URL` | ✅ (idêntico ao de cima) |
| `config/api.ts` | `'http://10.0.2.2:8080'` **hardcoded** | — |
| `.env.local` | `http://localhost:8080` | — |

- `api.ts` (raiz) e `services/api.ts` são **praticamente idênticos** → duplicação; manter apenas um.
- `config/api.ts` tem URL **hardcoded e diferente** do `.env.local`. `10.0.2.2` serve emulador Android; `localhost` não funciona em device físico. Isso precisa ser unificado numa única fonte.

### 3.2. `userService.ts` sem token 🔴
`userService` usa `config/api.ts` (`API_BASE_URL`) e monta headers só com `Content-Type`. Como `/api/user/**` exige `bearerAuth`, **todas as chamadas retornarão 401/403**. Precisa passar pelo cliente autenticado (`apiRequest`).

### 3.3. O que já está correto ✅
- `services/inspectionService.ts` → `getAssignedInspections` bate com `GET /api/v1/inspections/assigned?technicianId&page&size` e lê `ApiResponse<Page<...>>` corretamente.
- `types/inspectionApi.ts` → `BackendInspection` é fiel ao `InspectionResponse` (ver 4.2 sobre `itemSnapshots`).
- `context/AuthContext.tsx` + `services/authService.ts` → login real, token guardado em `SecureStore`, `expiresIn` em ms. OK.

---

## 4. Detalhe por tela

### 4.1. LoginScreen — ✅ compatível

**Fluxo:** `LoginScreen` → `useAuth().login` → `authService.authenticate` → `POST /api/auth/login`.

Request `LoginRequest`: `{ email, password }` (ambos obrigatórios). ✔️
Response `LoginResponse`: `{ token, type, expiresIn (ms), user: UserResponse }`. ✔️

`UserResponse` do backend:
```jsonc
{ "id": 1, "name": "", "email": "", "role": "TECNICO",
  "active": true, "version": 0, "createdAt": "", "updatedAt": "" }
```

Observações:
- O mobile monta `organization: 'FieldOps'` **hardcoded** no `AuthContext` — o backend **não** tem esse campo. (ver D-05)
- `role` é mapeado como string livre; o enum real é `ADMIN | SUPERVISOR | TECNICO`.

### 4.2. InspectionsScreen — ❌ quebrada (mock)

**Erros de compilação atuais:** importa `MOCK_INSPECTIONS`, `Inspection`, `InspectionStatus`, `Priority` de `data/inspections` — nenhum existe mais (4× TS2305 + 5× TS7006 em cascata).

**Rota correta:** `GET /api/v1/inspections/assigned?technicianId={user.id}&page&size` (já implementada no service).

**Incompatibilidade de modelo** — a UI usa campos que o `InspectionResponse` **não possui**:

| Campo usado na UI | Existe no backend? | Observação |
|---|---|---|
| `code` | ❌ | Não há código amigável; só `id`. |
| `title` | ⚠️ | Usar `templateTitle`. |
| `priority` (Alta/Média/Baixa) | ❌ | **Não existe prioridade no backend.** Precisa de origem definida. |
| `progress` (0–100) | ❌ | Derivar de `GET /inspections/{id}/responses/progress` (endpoint existe). |
| `deadline` / `deadlineOverdue` | ⚠️ | Backend tem `scheduledDate` (date). "Atrasada" é derivado (data passada + não concluída). |
| `assignee` | ✔️ | `assignedToName`. |
| `equipment` | ✔️ | `equipmentName` (pode ser `null`). |
| `estimatedTime` | ❌ | Não existe. |
| `area` | ⚠️ | Aproximar por `siteName`. |
| `status` (PT) | ⚠️ | Mapear do enum EN. Filtros da UI (`Atribuída`/`Em Andamento`/`Atrasada`/`Devolvida`) não são 1:1 com os 7 status. |

**Mapeamento de status sugerido (a confirmar):**

| Filtro UI | Status backend |
|---|---|
| Atribuída | `SCHEDULED` |
| Em Andamento | `IN_PROGRESS` |
| Devolvida | `REJECTED` |
| Atrasada | derivado: `scheduledDate < hoje` e status ∉ {`COMPLETED`,`APPROVED`,`CANCELLED`} |

### 4.3. InspectionDetailScreen — ❌ quebrada (mock)

Importa `MOCK_INSPECTIONS` e `Priority`. Usa `inspection.location`, `equipment`, `progress`, `deadline`, `status`, `code`, `title`, `priority`.

**Rota correta:** `GET /api/v1/inspections/{id}` → `ApiResponse<InspectionResponse>` (inclui `itemSnapshots[]`).
- `location` deve virar `siteName` (backend não tem "location").
- `id` é `number` no backend, mas a rota de navegação declara `string` (ver D-02).
- Progresso real: `GET /api/v1/inspections/{inspectionId}/responses/progress`.

### 4.4. InspectionFormScreen — ❌ quebrada (mock)

Importa `MOCK_CHECKLIST`, `ChecklistItem`, `ChecklistAnswer` (inexistentes).

**Incompatibilidade de modelo de resposta.** A UI tem 4 respostas de conformidade em PT:
`Conforme | Atenção | Inconforme | Não verificado`.

O backend modela respostas por **`responseType`** do item e um campo `value` string livre + `notApplicable` boolean:
- `responseType`: `TEXT_SHORT | TEXT_LONG | NUMBER | BOOLEAN | CONFORMITY | SINGLE_CHOICE | DATE`.
- Não há enum fechado de "Conforme/Atenção/Inconforme" no contrato — isso tem que ser convencionado no `value` de itens `CONFORMITY` e alinhado com o time de backend.

**Rota de persistência:** respostas são gravadas **por execução**, não direto na inspeção (ver 4.5).

### 4.5. ChecklistExecutionScreen — ❌ quebrada (mock)

Importa `MOCK_CHECKLIST`, `ChecklistItem`, `ChecklistAnswer`, `ChecklistEvidence`. Hoje só navega e tem `TODO: submeter checklist ao backend`.

**Fluxo real do backend (execução em campo, perfil TECNICO):**

1. **Iniciar execução** — `POST /api/v1/inspections/{inspectionId}/executions?requestingUserId={id}`
   Body `StartExecutionRequest`: `{ gpsLatitude*, gpsLongitude*, startedAt }`.
   → retorna `ExecutionResponse` com `executionId`.
   *(Alternativa/estado: `PATCH /api/v1/inspections/{id}/start`.)*
2. **Responder cada item** — `POST /api/v1/executions/{executionId}/responses?requestingUserId={id}`
   Body `ChecklistResponseRequest`: `{ snapshotItemId*, value, observation, notApplicable, gpsLatitude, gpsLongitude, respondedAt }`.
3. **Evidências (fotos)** — `POST /api/v1/inspections/{id}/evidences?uploadedByUserId={id}` (**multipart/form-data**, campo `file`; opcional `responseId`/`nonConformityId`).
4. **Não conformidade** (quando Inconforme) — `POST /api/v1/inspections/{id}/non-conformities` (`title*`, `severity*` ∈ LOW/MEDIUM/HIGH/CRITICAL, `snapshotItemId`, `description`).
5. **Finalizar execução** — `PATCH /api/v1/executions/{executionId}/complete?requestingUserId={id}`
   Body `CompleteExecutionRequest`: `{ endGpsLatitude, endGpsLongitude, completedAt, notes }`.
   *(E/ou `PATCH /api/v1/inspections/{id}/complete`.)*
6. **Pausar** — `PATCH /api/v1/executions/{executionId}/pause?requestingUserId={id}`.

**Incompatibilidades:**
- A UI referencia tipo `PHOTO` como se fosse um `responseType`. No backend **não existe `PHOTO`**; evidência é um recurso separado (endpoint de upload). Fotos devem ser anexadas via evidence, não como "resposta".
- Tipos da UI `TEXT`/`CHOICE` ↔ backend `TEXT_SHORT`/`TEXT_LONG` e `SINGLE_CHOICE`. Precisa mapa.
- O backend exige **GPS obrigatório** ao iniciar execução (`gpsLatitude`/`gpsLongitude` required) — a UI ainda não coleta GPS.
- Cada resposta referencia `snapshotItemId` (do `InspectionItemSnapshotResponse`), não o id do item do template. Os snapshots vêm no `GET /inspections/{id}` (`itemSnapshots[]`).

**Sobre `itemSnapshots`:** no `types/inspectionApi.ts` está tipado como `unknown[]`. O schema real é `InspectionItemSnapshotResponse`:
```jsonc
{ "id", "originalItemId", "code", "title", "description",
  "responseType", "required", "observationRequiredOnFailure",
  "evidenceRequiredOnFailure", "optionsJson",
  "sectionTitle", "sectionDisplayOrder", "itemDisplayOrder" }
```
Recomenda-se tipar isso (é o que alimenta o checklist).

### 4.6. QRScannerScreen — ❌ quebrada (mock)

Importa `MOCK_CHECKLIST`. Hoje compara o conteúdo lido com o mock e navega para `InspectionForm`.

**Rota correta:** `GET /api/v1/equipments/qrcode/{qrCode}` → `ApiResponse<EquipmentResponse>`:
```jsonc
{ "id", "name", "description", "qrCode",
  "status": "ACTIVE|INACTIVE|DECOMMISSIONED",
  "siteId", "siteName", "version", "createdAt", "updatedAt" }
```
O scanner deve resolver o `qrCode` → equipamento real no backend, em vez de casar com mock.

### 4.7. SyncScreen — ❌ 100% mock

Compila, mas usa `PENDING_QUEUE`/`SENT_ITEMS`/`APPROVED_ITEMS` fixos. A UI modela 3 estados: `pending | sent | approved`.

**Rotas reais de sincronização:**
- **Download offline** — `GET /api/v1/my-orders/pending-sync?technicianId={id}` → inspeções `SCHEDULED`/`IN_PROGRESS` com template completo (para trabalhar offline).
- **Upload de lote** — `POST /api/v1/sync?technicianId={id}`:
  ```jsonc
  { "operations": [
    { "idempotencyKey": "", "inspectionId": 0,
      "operationType": "START_INSPECTION|SAVE_RESPONSE|SAVE_NON_CONFORMITY|UPLOAD_EVIDENCE|COMPLETE_INSPECTION",
      "payload": "<json string>" } ] }
  ```
  → `SyncResponse`: `{ status: SUCCESS|PARTIAL|FAILED, total, synced[], failed[], processedAt }`.
- **Status por inspeção** — `GET /api/v1/inspections/{id}/sync-status`.
- Existe `POST /api/v1/sync/batch` marcado como **legado** — preferir `/api/v1/sync`.

**Incompatibilidade semântica:** o backend não expõe "enviadas/aprovadas" prontos para essa tela. "Pendente" ≈ fila local a enviar; "enviada" ≈ resultado do `/sync`; "aprovada" dependeria do status da inspeção (`APPROVED`) via listagem. O agrupamento da UI precisa ser derivado, não há 1 endpoint que devolva exatamente esses 3 baldes.

### 4.8. ProfileScreen — ⚠️ parcial

- `user.name` / `user.role` vêm reais do `AuthContext`. ✔️
- `organization` é **hardcoded** (`'FieldOps'`) e não existe no backend. (D-05)
- `role` é exibido cru (`TECNICO`) — considerar rótulo amigável.
- As métricas ("12 concluídas", "96% aprovações", "0 devolvidas") são **mock**. **Não há endpoint de métricas/dashboard** no contrato atual → precisa ser criado no backend ou derivado client-side via listagens.

### 4.9. DashboardScreen — ⛔ placeholder

Só renderiza `<Text>Dashboard</Text>`. Sem integração. Não há endpoint de dashboard no backend; se for necessário, definir com o time de backend.

### 4.10. EquipmentScreen — ⛔ placeholder

Só renderiza `<Text>Equipamentos</Text>`. Endpoints disponíveis para popular:
- `GET /api/v1/sites/{siteId}/equipments` (paginado, filtros `name`, `status`).
- `GET /api/v1/equipments/{id}` e `GET /api/v1/equipments/qrcode/{qrCode}`.

---

## 5. Endpoints do backend relevantes ao mobile (referência rápida)

| Método | Rota | Uso no mobile |
|---|---|---|
| POST | `/api/auth/login` | Login (público) |
| POST | `/api/auth/register` | Cadastro (público) |
| GET | `/api/user`, `/api/user/{id}` | Perfil/admin (requer token) |
| GET | `/api/v1/inspections/assigned` | Lista do técnico (InspectionsScreen) |
| GET | `/api/v1/inspections` | Lista com filtros (alternativa) |
| GET | `/api/v1/inspections/{id}` | Detalhe + `itemSnapshots` |
| PATCH | `/api/v1/inspections/{id}/start` \| `/complete` \| `/cancel` | Transições de estado |
| GET/POST | `/api/v1/inspections/{inspectionId}/executions` | Execução em campo |
| GET | `/api/v1/executions/{executionId}` | Buscar execução |
| PATCH | `/api/v1/executions/{executionId}/complete` \| `/pause` | Finalizar/pausar |
| GET/POST | `/api/v1/executions/{executionId}/responses` | Respostas do checklist |
| GET | `/api/v1/inspections/{inspectionId}/responses/progress` | Progresso (%) |
| GET/POST | `/api/v1/inspections/{id}/non-conformities` | Não conformidades |
| GET/POST | `/api/v1/inspections/{id}/evidences` | Upload de fotos (multipart) |
| GET | `/api/v1/equipments/qrcode/{qrCode}` | QRScanner |
| GET/POST | `/api/v1/sites/{siteId}/equipments` | EquipmentScreen |
| POST | `/api/v1/sync` | Upload de lote offline |
| GET | `/api/v1/my-orders/pending-sync` | Download offline |
| GET | `/api/v1/inspections/{id}/sync-status` | Status de sync |

---

## 6. Divergências e pendências consolidadas

| # | Severidade | Tema | Descrição | Ação sugerida (mobile, salvo indicação) |
|---|---|---|---|---|
| D-01 | 🔴 Alta | Build quebrado | `data/inspections.ts` perdeu `MOCK_INSPECTIONS`, `MOCK_CHECKLIST`, `Inspection`, `Priority`, `ChecklistItem`, `ChecklistAnswer`, `ChecklistEvidence`; 5 telas não compilam | Criar view models próprios e camada de mapeamento `Backend* → UI` |
| D-02 | 🟠 Média | Tipos de ID | Backend usa `number`; `RootStackParamList` usa `inspectionId: string` | Padronizar para `number` nas rotas de navegação |
| D-03 | 🔴 Alta | Config de URL | `config/api.ts` hardcoded `10.0.2.2` ≠ `.env.local` `localhost`; 3 fontes de base URL | Unificar numa só fonte (`EXPO_PUBLIC_API_URL`) |
| D-04 | 🔴 Alta | Auth faltando | `userService` não envia `Bearer` → 401/403 | Rotear por `apiRequest` com token |
| D-05 | 🟡 Baixa | Campo inexistente | `organization` hardcoded no mobile, ausente no backend | Remover ou definir origem real |
| D-06 | 🟠 Média | Campos de inspeção | `priority`, `progress`, `estimatedTime`, `area`, `code`, `deadline` não existem no `InspectionResponse` | Derivar (`progress` via endpoint), aproximar (`area`←`siteName`) ou **alinhar com backend** (`priority`) |
| D-07 | 🟠 Média | Modelo de resposta | Conformidade PT (Conforme/Atenção/Inconforme/Não verificado) sem enum no backend; `value` é string livre | Convencionar valores com o backend |
| D-08 | 🟠 Média | `responseType` | UI usa `TEXT`/`CHOICE`/`PHOTO`; backend usa `TEXT_SHORT`/`TEXT_LONG`/`SINGLE_CHOICE` e evidência é recurso à parte | Mapear tipos; tratar foto como evidence |
| D-09 | 🟠 Média | GPS obrigatório | `StartExecutionRequest` exige `gpsLatitude`/`gpsLongitude`; app não coleta GPS | Integrar `expo-location` no início da execução |
| D-10 | 🟡 Baixa | `itemSnapshots` | Tipado como `unknown[]`; schema real é `InspectionItemSnapshotResponse` | Tipar corretamente |
| D-11 | 🟠 Média | Sync mock | SyncScreen sem integração; baldes "enviada/aprovada" não têm endpoint 1:1 | Derivar estados a partir de `/sync` + status da inspeção |
| D-12 | 🟡 Baixa | Métricas ausentes | ProfileScreen usa stats fixas; sem endpoint de métricas | Criar endpoint no backend ou derivar client-side |
| D-13 | 🟡 Baixa | Duplicação | `api.ts` (raiz) ≡ `services/api.ts` | Manter apenas um cliente |
| D-14 | 🟡 Baixa | Status derivados | Filtros `Atrasada`/`Devolvida` não são status nativos | Derivar no mobile (regra de data / `REJECTED`) |

---

## 7. Ordem de integração sugerida

1. **Fundação (desbloqueia tudo):** D-03 (URL única), D-04 (token no userService), D-13 (um cliente HTTP só). Tipar `itemSnapshots` (D-10).
2. **Listagem:** InspectionsScreen com `getAssignedInspections` + mapeamento `BackendInspection → UI` e resolução de D-02, D-06, D-14.
3. **Detalhe:** InspectionDetailScreen com `GET /inspections/{id}` + progresso.
4. **Execução (fluxo crítico):** ChecklistExecutionScreen — start execução (+GPS, D-09), responses por item (D-07, D-08), evidências multipart, não conformidades, complete.
5. **QR:** QRScanner com `equipments/qrcode/{qrCode}`.
6. **Sync:** download (`my-orders/pending-sync`) + upload (`/sync`) + status (D-11).
7. **Secundárias:** EquipmentScreen (listagem por site), ProfileScreen (métricas, D-12), DashboardScreen.

---

## 8. Pontos a confirmar com o time de backend

- **Prioridade** da inspeção (`Alta/Média/Baixa`): existe no domínio? Vai entrar no `InspectionResponse`? (bloqueia D-06)
- **Valores de conformidade**: qual `value` usar para itens `CONFORMITY`? Há enum canônico? (bloqueia D-07)
- **Métricas do técnico** (concluídas / % aprovação / devolvidas): haverá endpoint? (bloqueia D-12)
- **`organization`**: o app deve exibir organização? De onde vem? (D-05)
- **Login vs `/api/v1`**: confirmar que login continua em `/api/auth/login` (sem versão) de forma permanente.

---

*Gerado a partir do contrato OpenAPI do backend em `http://localhost:8080/v3/api-docs`. Reexecutar a análise se o contrato mudar.*
