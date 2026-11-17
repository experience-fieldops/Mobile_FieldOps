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

## M9 — Perfil

- **Métricas derivadas client-side.** Sem endpoint de métricas (B-07), a tela
  calcula "concluídas / % aprovações / devolvidas" a partir das inspeções do
  técnico (`getAssignedInspections`). Limitação: usa só a página retornada
  (size=100), não o histórico inteiro. Endpoint dedicado fica como futuro.
- **`organization` removido.** O hardcode `'FieldOps'` saiu do `AuthContext`
  (B-06). A tela só mostra o item "Organização" se o backend fornecer o campo.
- **Rótulo de `role`.** `TECNICO`→"Técnico", `ADMIN`→"Administrador",
  `SUPERVISOR`→"Supervisor".

---

## Ajustes pós-upgrade para Expo SDK 58 / React Native 0.88

O `package.json` passou de Expo 57 / RN 0.86 para **Expo 58 / RN 0.88.1**
(`react` 19.3, `@types/react` 19.3). Isso quebrou tipos e o bundle em três
pontos, corrigidos assim:

- **`StatusBar` sem `backgroundColor`.** A prop foi removida dos 9 `<StatusBar>`
  (8 telas; `QRScannerScreen` tem 2). No RN 0.88 o tipo do `StatusBar` só aceita
  `barStyle`, `hidden`, `animated` e `showHideTransition`: a barra do Android é
  edge-to-edge e a cor não é mais controlada por prop. A cor do topo vem do
  `backgroundColor: '#132539'` do próprio header de cada tela.
  - **Em aberto:** os headers usam `paddingTop: 15` fixo, então no Android o
    conteúdo pode ficar sob a barra de status. Solução prevista: aplicar os
    insets de `react-native-safe-area-context` (já instalado). Não verificado
    em device.
- **Ref do `ScrollView` (`ChecklistExecutionScreen`).** `useRef<ScrollView>`
  virou `useRef<ScrollViewInstance>` (tipo exportado por `react-native`). Nos
  tipos do RN 0.88 o `ScrollView` é um componente de função, então
  `scrollTo` não existe no tipo do componente, só na instância.
- **`services/nonConformityService.ts` restaurado.** O arquivo versionado estava
  deletado no working tree e o Metro falhava com `Unable to resolve module
  ../services/nonConformityService`. Conteúdo igual ao versionado (só o
  comentário foi ampliado). Endpoint:
  `POST /api/v1/inspections/{id}/non-conformities`.
- **Verificação:** `tsc --noEmit` e `eslint` sem erros; `expo export --platform
  android` conclui (bundle sem módulos não resolvidos); `expo install --check`
  sem divergência de versões. Não houve execução em device/Expo Go.

### Para rodar no Expo Go

- **`EXPO_PUBLIC_API_URL` no `.env.local` não pode ser `localhost`.** No
  celular, `localhost` é o próprio celular. Use o IP da máquina na mesma rede
  Wi-Fi do aparelho (ex.: `http://<IP-da-maquina>:8080`) e reinicie o Metro com
  `npx expo start -c`, pois variáveis `EXPO_PUBLIC_*` são lidas na inicialização.
- O backend precisa aceitar conexões de outros dispositivos (porta 8080
  liberada no firewall do Windows). Responder no IP local da própria máquina não
  prova que o celular alcança.
- O Expo Go instalado no aparelho precisa suportar o SDK 58.

---

## Correções do fluxo "Iniciar" / "Finalizar" (teste em device e web)

- **409 ao iniciar.** O backend recusa nova execução se a inspeção não estiver
  `SCHEDULED`/`IN_PROGRESS` ou se já houver execução `IN_PROGRESS`. A tela
  criava uma execução nova a cada abertura. Agora: consulta
  `GET /inspections/{id}/executions` e **retoma** a execução em andamento do
  mesmo técnico (o `saveResponse` do backend é upsert); para status não
  executáveis mostra mensagem clara em vez do 409.
- **Erro ao finalizar (404 no upload).** O app enviava o id do
  `ChecklistResponse` como `responseId` do upload, mas o backend espera um id
  de `InspectionResponse`. Agora a foto sobe **sem `responseId`** (vinculada à
  inspeção e à NC). Ver B-12.
- **Upload no web.** No navegador o `FormData` não aceita `{ uri, name, type }`;
  o serviço converte a imagem em `Blob` quando `Platform.OS === 'web'`.
- **Mensagens de erro.** `services/api.ts` passa a anexar o `message` que o
  backend devolve no corpo do erro ("Motivo: …"), exceto em 401 e 5xx.
- **400 ao finalizar (formato do `value`).** O backend (commit `a54749e`)
  passou a validar o valor de cada resposta (`ResponseValueValidator`). O app
  agora converte em `data/mappers.ts`: conformidade → enum `ConformityValue`
  (Conforme→CONFORMING, Atenção→ATTENTION, Inconforme→NON_CONFORMING,
  Não verificado→NOT_VERIFIED); data dd/mm/aaaa → yyyy-MM-dd; número com
  vírgula → ponto. Resolve B-01 e B-09.
- **Ordem do envio.** O "Finalizar" grava todas as respostas primeiro (upsert,
  seguro de repetir) e só depois cria NCs e sobe fotos. Antes, uma resposta
  recusada no meio deixava fotos já enviadas, que duplicavam a cada nova
  tentativa.

---

## Execução offline e fila de sincronização (B-11)

**Requisito.** Sem internet, o técnico abre e executa uma inspeção já
atribuída a ele, finaliza, e ela fica na "Fila para sincronização". Quando a
internet volta, a fila é enviada ao backend.

**Decisão: opção (B) — a fila reenvia o fluxo online.** A fila não usa
`POST /api/v1/sync`: esse endpoint grava respostas em `InspectionResponse` e
inicia pela regra de `InspectionService.start` (sem execução/GPS), enquanto o
app online grava em `ChecklistResponse` via execução. Reenviar as mesmas
chamadas do fluxo online mantém todos os dados no mesmo modelo.

**Como funciona.**
- `services/offlineStore.ts`: com internet, a lista de inspeções e o detalhe
  (com os itens do checklist) das que podem ser executadas são salvos no
  aparelho (AsyncStorage, por usuário).
- `services/api.ts`: falha de rede e timeout são marcados (`isNetworkError`);
  é isso que decide o modo offline (ter Wi-Fi não garante alcançar o backend).
- `ChecklistExecutionScreen`: sem conexão, abre a cópia salva e mostra aviso.
  Ao finalizar, a inspeção sempre entra na fila; com conexão é enviada na hora.
- `services/syncQueue.ts`: envia execução → respostas → NCs → fotos →
  conclusão, gravando o progresso de cada etapa. Envio interrompido continua
  de onde parou sem duplicar NC nem foto. Queda de rede = continua pendente;
  recusa do servidor = fica com o motivo, visível na tela de Sincronização.
- `services/network.ts` (`@react-native-community/netinfo` 12.0.1): envio
  automático ao abrir o app e sempre que a conexão volta.
- `SyncScreen`: "Fila para sincronização" agora é a fila local (com motivo da
  falha e botão "Sincronizar agora"). "Modo Offline" só aparece sem conexão.
- `InspectionsScreen`: sem conexão, mostra a lista salva; inspeções na fila
  aparecem como concluídas.
- Datas da fila vão em hora local sem fuso (`yyyy-MM-ddTHH:mm:ss`), formato que
  o `LocalDateTime.parse` do backend aceita; `toISOString()` (com `Z`) era
  ignorado e virava a hora do servidor.

**Limitações conhecidas.**
- Só abre offline o que foi baixado antes: a lista precisa ter sido carregada
  com internet depois da atribuição.
- Login exige internet. Para abrir o app offline no celular, a sessão precisa
  estar salva ("Lembrar-me"). No web a sessão não é persistida.
- O token expira; se expirar durante o período offline, o envio pede novo login.
- Fotos no celular ficam no endereço do image-picker (cache do app); se o
  sistema limpar o cache antes do envio, a foto se perde. No web são
  convertidas em data URL (limite de ~5 MB do localStorage).
- GPS de início: se não houver posição ao abrir offline, usa a do fim; sem
  nenhuma, o envio falha com motivo claro.
- Se o técnico mudar um item de Inconforme para outro valor após a NC já ter
  sido enviada, a NC não é desfeita.

**Verificação.** `tsc` e `eslint` sem erros; bundles web e Android exportados;
20 cenários da fila testados contra backend simulado (queda de rede e
retomada sem duplicar, recusa 400 com motivo, envio automático x manual,
reaproveitamento de execução, execução de outro técnico). Não testado em
device sem internet.

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
