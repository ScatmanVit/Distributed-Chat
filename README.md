<a name="top"></a>

<div align="center">

# DistributedChat

**A distributed real-time messaging system with WebSocket, Redis pub/sub, and PostgreSQL. Handles cross-instance message delivery, JWT auth, rate limiting, and includes comprehensive test coverage.**

![Node.js](https://img.shields.io/badge/Node.js_22-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)

</div>

---

## Overview

When User A on WebSocket Instance 1 sends a message to User B on Instance 2, Redis pub/sub routes the message between servers. PostgreSQL persists everything with message status tracking (sent → delivered → read). JWT authenticates connections, and Redis-backed rate limiting prevents spam.

**Stack:** Node.js 22, TypeScript, Socket.io, Redis, PostgreSQL, Vitest, Docker

---

## Features

- Multiple WebSocket instances synchronized via Redis Adapter
- JWT authentication with middleware-based verification
- Rate limiting: 20 messages/10s per user, 30s block if exceeded
- Message persistence with status lifecycle in PostgreSQL
- Cross-instance message delivery tested in integration tests
- Database migrations with node-pg-migrate
- Structured logging with Pino
- 53 test cases (unit + integration)

---

## Architecture
```
Client A ──→ WebSocket Instance 1 ──┐
                                     ├──→ Redis Pub/Sub ──→ PostgreSQL
Client B ──→ WebSocket Instance 2 ──┘

JWT Auth → Rate Limiter → Message Status Tracking
```

---

## Project Structure
```
websocket/
├── src/
│   ├── __tests__/
│   │   ├── unit/              # Handlers, services, middleware, validators
│   │   └── integration/       # Full flows, distributed scenarios
│   ├── db/                    # PostgreSQL pool
│   ├── handlers/              # Socket event handlers
│   ├── middleware/            # JWT auth
│   ├── redis/                 # Redis clients + rate limit ops
│   ├── services/              # Business logic (messages, users)
│   ├── shared/                # Logger, rate limiter
│   ├── types/                 # TypeScript interfaces
│   ├── validations/           # Zod schemas
│   └── index.ts
├── Dockerfile
├── Dockerfile.test            # Test runner image
└── vitest.config.ts

db/
├── migrations/
│   └── initial_tables.js      # Users + messages schema
└── Dockerfile

docker-compose.yaml            # Production environment
docker-compose.test.yml        # Isolated test environment
```

---

## Quick Start

**1. Setup environment**
```bash
cp .env.example .env
cp websocket/.env.example websocket/.env
```

Edit `.env`:
```env
POSTGRES_USER=user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=chat_db
```

Edit `websocket/.env`:
```env
JWT_SECRET=your_secret
DB_HOST=db
REDIS_HOST=redis
```

**2. Start services**
```bash
docker compose up -d --build
```

**3. Check status**
```bash
docker compose ps
```

---

## Local Development
```bash
# Start dependencies
docker compose up -d db redis

# Run migrations
cd db && npm install && npm run migrate

# Start server
cd websocket && npm install && npm run dev
```

---

## Testing

**Run tests**
```bash
cd websocket

npm test                    # All tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test:integration    # Integration only
```

**Test structure**
- 28 unit tests: handlers, services, middleware, rate limiter, validators
- 25 integration tests: WebSocket flows, distributed delivery, reconnection, rate limiting

**Integration test environment**

Integration tests run in an isolated environment using `docker-compose.test.yml`:
- Separate test database (`chat_db_test`)
- Dedicated Redis instance
- Two WebSocket instances for distributed scenarios
- Automatic database cleanup between tests
- No interference with development/production data
```bash
# Run integration tests in Docker
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

---

## API Events

**Client → Server**

`send-message`
```typescript
socket.emit('send-message', {
  toUserId: 'uuid',
  content: 'Hello'
}, (response) => {
  // response.success, response.message
});
```

`seen-message`
```typescript
socket.emit('seen-message', [
  { id: 'msg-uuid', toUserId: 'sender-uuid', seen: true }
], (response) => {
  // response.success
});
```

**Server → Client**

`new-message` — Receive a message  
`messages-seen-new` — Messages marked as read

---

## Database Schema

**users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**messages**
```sql
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status message_status DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## Design Patterns & Best Practices

### Dependency Injection
Services are factory functions that receive dependencies as parameters, eliminating tight coupling and making unit tests trivial.
```typescript
// Service receives pool, not imports it
export const createMessageService = (pool: Pool) => ({
  save: async (msg) => pool.query(/* ... */)
});

// In tests, inject mocks
const mockPool = { query: vi.fn() };
const service = createMessageService(mockPool);
```

### Clean Architecture
Clear separation of concerns across three layers:
- **Handlers** — validate input, orchestrate service calls, return responses
- **Services** — pure business logic, no knowledge of HTTP/WebSocket
- **Middleware** — authentication, rate limiting, cross-cutting concerns

No circular dependencies, no god objects.

### Type Safety at Every Layer
Runtime validation meets compile-time guarantees:
- **Zod schemas** validate untrusted input at API boundaries
- **TypeScript interfaces** enforce contracts between modules
- **Strict mode enabled** — no implicit `any`, all nulls handled explicitly
- **Domain types** separated from database schemas with mapping layer

### Error Handling Strategy
- **Fail fast** — invalid input rejected immediately with descriptive errors
- **Fail safe** — non-critical failures (Redis down) don't crash the app
- **Structured responses** — `{ success: false, error: string }` format
- **Full logging context** — errors include userId, timestamp, stack trace

### Testing Philosophy
Integration tests use **real dependencies** (PostgreSQL, Redis) to verify actual behavior. Unit tests use **mocks** only where necessary. Database cleaned between tests for true isolation.
```typescript
// Integration test: real database, real Redis
const socket = createTestSocket({ url: WS_URL_1, userId: TEST_USER });
await socket.emit('send-message', { toUserId, content });

// Unit test: mock database
const mockPool = { query: vi.fn().mockResolvedValue({ rows: [...] }) };
const service = createMessageService(mockPool);
```

---

## CI/CD

GitHub Actions workflow in `.github/workflows/deploy.yaml` runs on push to `main`:
1. Install dependencies
2. Run test suite
3. Fail if tests don't pass

---

## Tech Stack

- Node.js 22 (Alpine)
- TypeScript 5.9
- Socket.io 4.8 + Redis Adapter
- PostgreSQL 14+ + pg driver
- Redis (Alpine)
- Zod 4.3
- jsonwebtoken
- Vitest 4.0
- Docker + Docker Compose
- Pino (structured logging)
- node-pg-migrate

---

## What I Learned

- Distributed state synchronization with Redis pub/sub
- Testing distributed systems with real infrastructure
- Rate limiting across multiple instances
- Message lifecycle management (status tracking)
- Dependency injection for testability
- TypeScript + Zod for full type safety
- Database migrations in containerized apps

<br>

<div align="center">

<a href="#top">↑ back to top</a>

</div>