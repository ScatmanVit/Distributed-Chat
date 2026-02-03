# Chat em Tempo Real Distribuído 🚀

> Uma aplicação de chat distribuída com WebSocket, usando Node.js, PostgreSQL, Redis e Docker. Suporta múltiplas instâncias de WebSocket com sincronização em tempo real via Redis Adapter.

## 📋 Visão Geral

Este é um projeto de chat em tempo real completo, com arquitetura distribuída escalável. Permite que múltiplos usuários se comuniquem instantaneamente, com sincronização de estado entre servidores WebSocket, rate limiting inteligente, e histórico persistente de mensagens.

### ✨ Características Principais

- ✅ **Chat em Tempo Real** - Comunicação instantânea via WebSocket
- ✅ **Arquitetura Distribuída** - Múltiplas instâncias WebSocket com Redis Adapter
- ✅ **Rate Limiting** - Proteção contra spam com limite por usuário
- ✅ **Persistência** - Histórico completo de mensagens em PostgreSQL
- ✅ **Status de Mensagens** - pending, sent, delivered, read, failed
- ✅ **Marcar como Lido** - Sincronização de status de leitura
- ✅ **Testes Automatizados** - Vitest com cobertura
- ✅ **Proxy Reverso** - Nginx com SSL/TLS
- ✅ **CI/CD** - GitHub Actions com deploy automático
- ✅ **Logging Estruturado** - Pino com múltiplos outputs

---

## 🛠️ Stack Técnico

### Backend (WebSocket)

- **Runtime:** Node.js 22 (Alpine) - Imagem ultraleve
- **Linguagem:** TypeScript 5.9 - Type safety garantido
- **Framework:** Socket.io 4.8 - Comunicação real-time
- **Database:** PostgreSQL 14+ - ACID transactions
- **Cache:** Redis Alpine - Pub/Sub + Rate Limiting
- **Driver:** pg (nativo) - Sem camada abstração
- **Validação:** Zod 4.3 - Schema validation em runtime
- **Logging:** Pino 10.2 - Logs estruturados e rápidos
- **Testing:** Vitest 4.0 - Testes unitários

### Infraestrutura & Orquestração

- **🐳 Docker Compose** ✨ - Orquestração de 6 serviços
  - Configuração single-file (`docker-compose.yaml`)
  - Health checks integrados para cada serviço
  - Resource limits por container (CPU + Memory)
  - Networking automático com bridge driver
  - Volumes persistentes (PostgreSQL data)
  - Dependências entre serviços (db → db_migrator → app)

- **Proxy Reverso:** Nginx Alpine com SSL/TLS
  - Sticky session (ip_hash) para WebSocket
  - Load balancing entre replicas
  - Let's Encrypt certificates

- **Message Broker:** Redis com Socket.io Adapter
  - Sincronização entre replicas WebSocket
  - Pub/Sub para eventos distribuídos
  - Rate limiting em memória

- **CI/CD:** GitHub Actions
  - Testes automáticos em cada push
  - Deploy direto na VPS via SSH
  - Rebuild Docker images

- **Deploy:** VPS via SSH + Docker Compose
  - Zero-downtime deployments
  - Auto-restart containers com políticas

### Database Migrations

- **Tool:** node-pg-migrate - Versionamento de schema
- **Linguagem:** Typescript - Consistência com codebase
- **Sistema:** SQL + TS helpers - Migrações up/down automáticas
- **Execução:** Container dedicated (db_migrator) - Roda antes do app iniciar e desliga quanto termina

---

## 📁 Estrutura do Projeto

```
chat_tempo_real_distribuido/
├── .github/
│   └── workflows/
│       └── deploy.yaml              # CI/CD pipeline (testes + deploy)
├── .nginx/
│   ├── Dockerfile                   # Imagem Nginx Alpine
│   └── nginx.conf                   # Configuração proxy reverso + SSL
├── db/
│   ├── migrations/
│   │   └── initial_tables.js        # Schema inicial (users, messages)
│   ├── queries/
│   │   └── all-messages.sql         # Query de exemplo (histórico)
│   ├── Dockerfile                   # Container de migrations
│   ├── package.json
│   └── .env                         # Variáveis DB
├── server/
│   ├── Dockerfile                   # Placeholder (será implementado)
│   └── .env
├── websocket/
│   ├── src/
│   │   ├── __tests__/               # Testes com Vitest
│   │   │   ├── handlers.test.ts
│   │   │   └── validation.test.ts
│   │   ├── db/
│   │   │   └── pool.ts              # Connection pool PostgreSQL
│   │   ├── handlers/                # Handlers de eventos Socket.io
│   │   │   ├── register.ts
│   │   │   ├── messages/
│   │   │   │   ├── message.ts       # send-message
│   │   │   │   └── seenMessage.ts   # seen-message
│   │   │   └── index.ts
│   │   ├── redis/
│   │   │   └── index.ts             # Redis client + pub/sub + rate limit
│   │   ├── services/                # Business logic
│   │   │   ├── user.ts
│   │   │   └── message.ts
│   │   ├── shared/
│   │   │   ├── logger.ts            # Pino logger
│   │   │   └── rate-limiter.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── validations/
│   │   │   ├── schemas.ts           # Zod schemas
│   │   │   └── validation.ts
│   │   └── index.ts                 # Entry point do servidor websocket
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── logs/
│   │   ├── app-prod.log
│   │   ├── error.log
│   │   ├── info.log
│   │   └── warn.log
│   └── .env
├── docker-compose.yaml              # Orquestração de containers
└── .gitignore
```

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│ Cliente (Web/Mobile)                                        │
│ Socket.io Client                                            │
└────────────┬────────────────────────────────────────────────┘
             │ WebSocket (ws://)
      ┌──────▼──────┐
      │ Nginx       │ (Proxy Reverso)
      │ :80 :443    │
      └──────┬──────┘
             │
   ┌─────────┴─────────┐
   │                   │
┌──▼───────┐     ┌───▼──────┐
│ WebSocket 1  │ │ WebSocket 2  │ (replicas: 2)
│ :8080        │ │ :8080        │
└──┬──────┘     └───┬──────┘
   │                │
   └────────┬───────┘
            │
      ┌─────▼─────┐
      │  Redis    │ Socket.io Adapter
      │  Pub/Sub  │ + Rate Limiting
      └─────┬─────┘
            │
┌───────────┴───────────┐
│                       │
┌──▼────────┐     ┌────▼──┐
│PostgreSQL │     │ Logs  │
│  Messages │     │ Pino  │
│  Users    │     └───────┘
└───────────┘
```

### Fluxo de Mensagem

```
1. Cliente envia: socket.emit('send-message', {toUserId, content})
   ↓
2. Validação Zod (sendMessageSchema)
   ↓
3. Rate Limiting (Redis) - máx 20 msgs em 10s
   ↓
4. MessageService.save() → INSERT PostgreSQL
   ↓
5. Socket.io emite para recipient: io.to(toUserId).emit('new-message', message)
   ↓
6. Redis Adapter sincroniza entre replicas
   ↓
7. Recipient recebe em tempo real
```

### Fluxo de Status (Lido)

```
1. Cliente marca msgs como lidas: socket.emit('seen-message', [{id, toUserId, seen: true}])
   ↓
2. Validação (seenMessageSchema) - array de mensagens
   ↓
3. MessageService.markAsSeen() → UPDATE status='read'
   ↓
4. Emite 'messages-seen-new' pro remetente
   ↓
5. Atualiza UI do sender
```

---

## 🚀 Como Rodar

### Pré-requisitos

- Docker + Docker Compose
- Node.js 22+ (para dev local)
- PostgreSQL 14+ (se rodar sem Docker)
- Redis (se rodar sem Docker)

### Com Docker (Recomendado)

```bash
# Clone o repositório
git clone <seu-repo>
cd chat_tempo_real_distribuido

# Configure variáveis de ambiente
cp .env.example .env
cp db/.env.example db/.env
cp websocket/.env.example websocket/.env

# Inicie tudo
docker compose up -d --build

# Verifique containers
docker compose ps

# Logs em tempo real
docker compose logs -f websocket
```

**URL do servidor:**
- WebSocket: `ws://localhost/ws` (prod) ou `ws://localhost:8080` (dev)
- REST API: `http://localhost/api` (prod)

### Dev Local

#### 1. Setup Database

```bash
cd db
npm install
npm run migrate  # Executa migrations

# Acesso direto ao PostgreSQL
npm run db:psql
```

#### 2. Start WebSocket

```bash
cd websocket
npm install
npm run dev  # usa tsx watch
```

Servidor roda em `http://localhost:8080`

#### 3. Testes

```bash
cd websocket

# Rodar testes
npm test

# Watch mode
npm run test:watch

# UI do Vitest
npm run test:ui

# Cobertura
npm run test:coverage
```

---

## 📝 API WebSocket

### Eventos do Cliente → Servidor

#### `register`
Registra usuário na conexão WebSocket.

```typescript
socket.emit('register', userId, (response) => {
  // response: { success: true, userId: string }
})
```

**Validação:** UUID 36 caracteres  
**Efeito:** Adiciona socket à room do usuário

---

#### `send-message`
Envia mensagem para outro usuário.

```typescript
socket.emit('send-message', {
  toUserId: 'uuid-destino',
  content: 'Olá!'
}, (response) => {
  // response: { success: true, message: Message }
  // ou: { success: false, error: string }
})
```

**Validação:**
- `toUserId`: UUID 36 chars
- `content`: 1-5000 caracteres (trim automático)

**Rate Limit:** 20 msgs/10s por usuário (bloqueio de 30s)

**Efeito:**
- INSERT em `messages` com status='sent'
- Emite `new-message` para recipient
- Callback retorna mensagem salva

---

#### `seen-message`
Marca mensagens como lidas.

```typescript
socket.emit('seen-message', [
  { id: 'msg-id', toUserId: 'uuid-sender', seen: true },
  { id: 'msg-id2', toUserId: 'uuid-sender', seen: true }
], (response) => {
  // response: { success: true }
})
```

**Validação:** Array com mínimo 1 mensagem  
**Efeito:**
- UPDATE `messages` SET status='read'
- Emite `messages-seen-new` ao sender

---

### Eventos do Servidor → Cliente

#### `new-message`
Recebimento de nova mensagem.

```typescript
socket.on('new-message', (message: Message) => {
  // message: { id, senderId, receiverId, content, status, sentAt }
})
```

---

#### `messages-seen-new`
Notificação que mensagens foram lidas.

```typescript
socket.on('messages-seen-new', (messages: SeenMessage[]) => {
  // messages: [{ id, senderId, status='read', receiverId, sentAt }]
})
```

---

## 🗄️ Banco de Dados

### Schema

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status message_status DEFAULT 'pending', -- enum: pending|sent|delivered|read|failed
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Queries Úteis

```bash
# Ver todas as mensagens entre alice e bob
npm run db:psql

\copy (SELECT * FROM messages ...) TO STDOUT WITH CSV;
```

---

## 🔒 Segurança

| Aspecto | Implementação |
|--------|--------------|
| **UUID** | Identificação de usuários (36 chars) |
| **Rate Limiting** | Redis (20 msgs/10s, bloqueio 30s) |
| **Validação** | Zod (runtime validation) |
| **CORS** | Configurável via `URL_FRONT_END` |
| **SSL/TLS** | Nginx com Let's Encrypt |
| **Logging** | Pino estruturado (sem dados sensíveis) |
| **Timeouts** | Connection timeouts PostgreSQL |

---

## 🧪 Testes

### Estrutura de Testes

```typescript
// websocket/src/__tests__/

validation.test.ts   // Validação Zod
├─ registerSchema
├─ sendMessageSchema
└─ seenMessageSchema

handlers.test.ts     // Handler register
└─ handleRegister
```

### Executar

```bash
cd websocket

# Tudo
npm test

# Padrão específico
npm test -- validation

# Watch
npm run test:watch

# Com UI
npm run test:ui

# Cobertura HTML
npm run test:coverage
```

---

## 📊 Monitoramento & Logs

### Pino Logger

**Níveis:** info, warn, error

**Ambientes:**
- **Development:** Console colorido + files
- **Production:** `logs/app-prod.log`

**Arquivos de Log:**
```
websocket/logs/
├── app-prod.log     # Logs de produção
├── error.log        # Apenas erros
├── info.log         # Info + warn + error
└── warn.log         # Warnings + error
```

**Exemplo:**
```json
{
  "level": 30,
  "time": "2026-01-15T20:44:44.686Z",
  "pid": 24924,
  "msg": "Servidor WebSocket rodando"
}
```

---

## 🐳 Docker Compose

### Serviços

| Serviço | Porta | Função | Replicas |
|---------|-------|--------|----------|
| `db` | 5432 | PostgreSQL | 1 |
| `db_migrator` | - | Migrations | 1 (one-shot) |
| `redis` | 6379 | Cache/Pub-Sub | 1 |
| `websocket` | 8080 | Socket.io | 2 |
| `server_rest` | 3000 | REST API | 1 |
| `nginx` | 80, 443 | Proxy | 1 |

### Health Checks

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U user -d chat_db"]
    interval: 15s
    timeout: 10s
    retries: 15
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: "0.20"      # WebSocket: 20% CPU
      memory: 400M      # WebSocket: 400MB RAM
```

---

## 🔄 CI/CD (GitHub Actions)

**.github/workflows/deploy.yaml**

```yaml
on: push to main

jobs:
  1. build-and-test
     - Setup Node 22.21.1
     - npm ci (websocket/)
     - npm test
     
  2. deploy (depends on build-and-test)
     - SSH na VPS
     - git pull origin main
     - docker compose down
     - docker compose up -d --build
```

**Setup Secrets:**
```
REMOTE_HOST       # IP da VPS
REMOTE_USER       # user SSH
SSH_PRIVATE_KEY   # Private key
```

**Comando Deploy:**
```bash
git push origin main  # Dispara workflow automaticamente
```

---

## 🌐 Nginx Reverse Proxy

### Configuração

```nginx
upstream websocket_cluster {
    ip_hash;              # Sticky session
    server websocket:8080;
}

upstream rest_api {
    server server_rest:3000;
}

server {
    listen 443 ssl;
    server_name projeto.sbs;
    
    ssl_certificate /etc/letsencrypt/live/projeto.sbs/fullchain.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location /api/ {
        proxy_pass http://rest_api/;
    }
    
    location /ws/ {
        proxy_pass http://websocket_cluster/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 86400s;
    }
}
```

---

## 📋 Variáveis de Ambiente

### `db/.env`
```env
PGPASSWORD=senha_db
POSTGRES_PASSWORD=senha_db
POSTGRES_USER=user
POSTGRES_DB=chat_db
DB_HOST=db
DB_PORT=5432
DB_USER=user
DB_PASSWORD=senha_db
DB_NAME=chat_db
```

### `websocket/.env`
```env
NODE_ENV=development
PORT=8080
URL_FRONT_END=http://localhost:3000

# Database
DB_HOST=db
DB_PORT=5432
DB_USER=user
DB_PASSWORD=senha_db
DB_NAME=chat_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

### `server/.env`
```env
NODE_ENV=production
PORT=3000
```

---

## 🚦 Status do Projeto

- ✅ WebSocket com Socket.io
- ✅ Distribuído (Redis Adapter)
- ✅ Rate Limiting
- ✅ Database PostgreSQL
- ✅ Migrations
- ✅ Testes (Vitest)
- ✅ Docker Compose
- ✅ Nginx + SSL
- ✅ CI/CD (GitHub Actions)
- ⏳ REST API (placeholder)
- ⏳ Autenticação JWT
- ⏳ Frontend (web/mobile)

---

## 📚 Recursos Úteis

- [Socket.io Docs](https://socket.io/docs/)
- [Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Zod Validation](https://zod.dev/)
- [Pino Logger](https://getpino.io/)
- [node-pg-migrate](https://salsita.github.io/node-pg-migrate/)
- [Vitest](https://vitest.dev/)

---

## 📄 Licença

MIT

---

## 👨‍💻 Desenvolvimento

**Stack Favorito e mais usado:** JavaScript/TypeScript, Node.js, PostgreSQL, Redis, Docker

**Melhorias Futuras:**
- [ ] Autenticação JWT
- [ ] Rooms/Grupo de Chat
- [ ] Notificações Push
- [ ] Avatar de Usuário
- [ ] Busca de Histórico
- [ ] Typing Indicators
- [ ] Reações de Mensagem
- [ ] Calls de Áudio/Vídeo (WebRTC)

---

