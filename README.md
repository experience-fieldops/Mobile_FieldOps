# FieldOps Mobile

Aplicativo do técnico de campo (Expo / React Native / TypeScript). Consome a
API Spring Boot do FieldOps e funciona sem internet: o técnico executa a
inspeção no aparelho e o envio acontece quando a conexão volta.

## Requisitos

- Node.js 20 ou superior
- Aplicativo Expo Go (ou um build de desenvolvimento) no celular
- API FieldOps em execução, acessível pela mesma rede do celular

## Como executar

```bash
npm install
```

Crie o arquivo `.env.local` (não é versionado) com o endereço da API:

```
EXPO_PUBLIC_API_URL=http://<IP-DO-COMPUTADOR>:8080
```

No celular, `localhost` é o próprio aparelho. Use o IP do computador na rede
Wi-Fi e mantenha celular e computador na mesma rede.

```bash
npx expo start
```

Escaneie o QR code com o Expo Go. Para abrir no navegador, tecle `w`.

## Usuários de demonstração

Criados pela API no ambiente de desenvolvimento (a base é recriada a cada
reinício da API):

| Perfil     | E-mail                    | Senha       |
| ---------- | ------------------------- | ----------- |
| Técnico    | `tecnico@fieldops.com`    | `Tec@123`   |
| Supervisor | `supervisor@fieldops.com` | `Sup@123`   |
| Admin      | `admin@fieldops.com`      | `Admin@123` |

O app é usado pelo técnico.

## Scripts

| Comando             | O que faz                         |
| ------------------- | --------------------------------- |
| `npm test`          | Testes unitários (Jest)           |
| `npm run lint`      | ESLint e Prettier                 |
| `npm run typecheck` | Verificação de tipos (TypeScript) |

## Estrutura

```
App.tsx, index.ts      entrada do app
navigation/            rotas (stack + abas)
screens/               telas
components/            componentes reutilizáveis
context/               sessão (AuthContext)
services/              API, fila offline, rascunho, GPS, rede
data/                  tipos de UI e conversões backend <-> UI (mappers)
types/                 contratos da API
__tests__/             testes
```

## Fluxo principal

1. **Login** (JWT, guardado no `expo-secure-store`).
2. **Lista de inspeções** atribuídas ao técnico, com filtros e contadores.
   A lista e os checklists das inspeções executáveis são baixados e salvos no
   aparelho.
3. **Abrir inspeção**: leitura do QR code do equipamento e pedido de
   consentimento de localização.
4. **Checklist dinâmico**: sete tipos de resposta, itens obrigatórios, foto
   (câmera ou galeria) e não conformidade com severidade.
5. **Finalizar**: nova leitura de localização. A inspeção entra na fila de
   sincronização.
6. **Sincronização**: com internet o envio é imediato. Sem internet, a
   inspeção espera na fila e é enviada ao reconectar.

## Offline e sincronização

- **Armazenamento:** SQLite (`expo-sqlite`). A fila de envio é uma tabela
  (`outbox`, em `services/outboxStore.ts`) e rascunhos e cópias das inspeções
  ficam no `expo-sqlite/kv-store`. No web, onde o SQLite ainda é
  experimental, usa o AsyncStorage.
- **Rascunho:** as respostas são gravadas no aparelho a cada alteração.
- **Fotos:** copiadas para uma pasta permanente do app e apagadas só depois
  do envio.
- **Envio (`services/syncQueue.ts`):** reproduz as chamadas do fluxo online
  (execução, respostas, não conformidades, fotos, conclusão). O progresso de
  cada etapa é gravado, então um envio interrompido continua de onde parou,
  sem duplicar não conformidades nem fotos.
- **Falhas:** sem conexão, a inspeção continua pendente. Recusa do servidor
  marca erro com o motivo, visível na tela de Sincronização. Sessão vencida
  mantém a inspeção pendente até um novo login.
- **Estado visível:** o indicador "Offline" (vermelho) ou "Online" (verde)
  aparece nas telas principais.

## Localização (RN-058 a RN-062)

- Pede consentimento antes de abrir a inspeção e antes de finalizá-la, com o
  aviso de que, sem localização, a inspeção não inicia nem finaliza.
- Leitura única em cada etapa. Não há rastreamento contínuo.
- Se a permissão for negada, o app orienta e oferece abrir as configurações.

## Build Android

O projeto usa EAS Build (`eas.json`). É necessário ter conta Expo.

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

O perfil `preview` gera um APK instalável. Defina a URL da API do build como
variável de ambiente do EAS (`EXPO_PUBLIC_API_URL`), porque o `.env.local` não
vai para o servidor de build.

## Limitações conhecidas

- **Sem chave de idempotência no servidor.** O endpoint `POST /api/v1/sync`
  do backend grava em um modelo diferente do fluxo online, então o app usa as
  mesmas chamadas do fluxo online. A prevenção de duplicidade é feita no
  cliente, por etapa.
- **Fotos sem vínculo com a resposta.** O backend espera o id de um modelo
  diferente (B-12 em `BACKEND_MELHORIAS.md`). A foto é enviada vinculada à
  inspeção, e à não conformidade quando existe.
- **Localização:** só latitude e longitude são enviadas. Precisão e horário da
  leitura não têm campo no backend.
- **Prioridade, progresso e tempo estimado** não vêm do backend e usam valores
  padrão.
- **QR code sem internet:** o equipamento não pode ser conferido no servidor.
  O app segue para a inspeção salva no aparelho.
- **Sessão:** o JWT dura 24 horas. Depois disso, o trabalho offline continua,
  mas o envio exige novo login.

## Documentos de apoio

- `INTEGRACAO.md`, `INTEGRACAO_MODULOS.md`: mapeamento da API e módulos.
- `DECISOES_INTEGRACAO.md`: decisões tomadas.
- `BACKEND_MELHORIAS.md`: pendências sugeridas para o backend.
