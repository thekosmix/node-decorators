# @thekosmix/node-decorators

> A production-grade, Spring-Boot-inspired TypeScript decorator suite for Node.js. Carve out boilerplate like caching (In-Memory & Redis), logging, resiliency, metrics, validation, distributed locking, circuit breaking, idempotency, transactions, authorization, and audit trails with clean annotations.

[![npm version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://www.npmjs.com/package/@thekosmix/node-decorators)
[![Tests](https://img.shields.io/badge/tests-70%20passing-brightgreen.svg)](https://github.com/thekosmix/node-decorators)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [What's New in v1.1.0](#whats-new-in-v110)
- [How to Use in an Existing Node.js Project](#how-to-use-in-an-existing-nodejs-project)
  - [Step 1: Install the Package](#step-1-install-the-package)
  - [Step 2: Configure TypeScript (`tsconfig.json`)](#step-2-configure-typescript-tsconfigjson)
  - [Step 3: Initialize `reflect-metadata` at Application Entry](#step-3-initialize-reflect-metadata-at-application-entry)
  - [Step 4: Use Decorators in Your Services (ESM & CommonJS)](#step-4-use-decorators-in-your-services-esm--commonjs)
  - [Step 5: (Optional) Connect Redis or File Logging](#step-5-optional-connect-redis-or-file-logging)
  - [Testing Locally in Another Project via `npm link`](#testing-locally-in-another-project-via-npm-link)
- [How to Test & Build](#how-to-test--build)
  - [Running the Test Suite](#running-the-test-suite)
  - [Running Specific Test Specs](#running-specific-test-specs)
  - [Running the Sample Demo Runner](#running-the-sample-demo-runner)
  - [Building for Production (ESM + CommonJS + Types)](#building-for-production-esm--commonjs--types)
  - [Verifying the npm Package](#verifying-the-npm-package)
- [Features & API Reference](#features--api-reference)
  - [1. Caching Suite (@Cache, @CacheEvict, @CachePut)](#1-caching-suite)
  - [2. Logging Suite (@Log)](#2-logging-suite)
  - [3. Resiliency Suite (@Retry, @Timeout, @RateLimit)](#3-resiliency-suite)
  - [4. Distributed Systems & Concurrency (@Lock, @CircuitBreaker)](#4-distributed-systems--concurrency)
  - [5. API & Data Integrity (@Idempotent, @Transactional)](#5-api--data-integrity)
  - [6. Security & Governance (@Authorize, @Roles, @Audit, @FeatureFlag)](#6-security--governance)
  - [7. Traffic Management & Performance (@SingleFlight, @Debounce, @Throttle)](#7-traffic-management--performance)
  - [8. Validation, Diagnostics & Fallback (@Validate, @Timed, @Catch, @Fallback, @Length, @Async, @Rest)](#8-validation-diagnostics--fallback)
- [License](#license)

---

## Overview

In Java's Spring Boot ecosystem, developers use annotations to separate cross-cutting concerns (caching, logging, retries, rate limits, locks, transactions) from business logic. `node-decorators` brings that exact ergonomic power to TypeScript and Node.js.

Instead of writing repetitive boilerplate inside your services:

```typescript
// Without decorators: repetitive boilerplate mixed into business logic
async function getUsernameById(userId: string) {
  const cached = await redis.get(`users:${userId}`);
  if (cached) return JSON.parse(cached);

  const start = Date.now();
  try {
    const user = await UserModel.findById(userId);
    await redis.set(`users:${userId}`, JSON.stringify(user.name), 'EX', 3600);
    logger.info(`getUsernameById took ${Date.now() - start}ms`);
    return user.name;
  } catch (err) {
    logger.error('Failed to get user', err);
    throw err;
  }
}
```

Decorate your methods cleanly:

```typescript
import { Cache, Log, Retry, Lock } from '@thekosmix/node-decorators';

class UserService {
  @Cache({ store: 'redis', bucket: 'users', ttl: 3600 })
  @Log()
  @Retry({ maxAttempts: 3 })
  @Lock({ key: (userId) => `user:${userId}` })
  async getUsernameById(userId: string) {
    const user = await UserModel.findById(userId);
    return user.name;
  }
}
```

---

## What's New in v1.1.0

Version `1.1.0` expands the suite with 10 enterprise utilities for distributed systems, security, transactions, and performance:

- 🔒 **Distributed Concurrency & Failsafe**: Added `@Lock` (Redis atomic `SET NX PX` distributed mutex & in-memory fallback) and `@CircuitBreaker` (automated `CLOSED` &rarr; `OPEN` &rarr; `HALF_OPEN` outage protection).
- 🔁 **API & Data Integrity**: Added `@Idempotent` (deduplication of retried requests/webhooks) and `@Transactional` (declarative database transactions with Node.js `AsyncLocalStorage` context propagation).
- 🛡️ **Security & Compliance**: Added `@Authorize` / `@Roles` (declarative RBAC and permission checking), `@Audit` (automatic compliance audit trails), and `@FeatureFlag` (dynamic runtime feature toggles).
- ⚡ **Traffic & Performance**: Added `@SingleFlight` (eliminates the thundering herd by coalescing concurrent in-flight calls), `@Debounce`, and `@Throttle`.
- ✅ **Test Coverage & Reliability**: 20 complete test suites with 70 passing automated tests covering all decorators and edge cases.

---

## How to Use in an Existing Node.js Project

### Step 1: Install the Package

```bash
npm install @thekosmix/node-decorators reflect-metadata
```

If you plan to use Redis caching or Redis distributed locking, install `ioredis`:

```bash
npm install ioredis
```

### Step 2: Configure TypeScript (`tsconfig.json`)

Decorators require experimental decorator support and decorator metadata. Ensure your `tsconfig.json` contains:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

### Step 3: Initialize `reflect-metadata` at Application Entry

Import `reflect-metadata` once at the very top of your application entry file (`index.ts`, `server.ts`, `app.ts`):

```typescript
// src/index.ts or server.ts
import 'reflect-metadata';
```

### Step 4: Use Decorators in Your Services (ESM & CommonJS)

#### In ES Modules (`import`):
```typescript
import { Cache, Log, Retry, Lock, CircuitBreaker } from '@thekosmix/node-decorators';

export class OrderService {
  @Lock({ key: (orderId) => `order:${orderId}` })
  @CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5000 })
  @Retry({ maxAttempts: 3, delayMs: 200 })
  async processOrder(orderId: string, amount: number) {
    return paymentGateway.charge(orderId, amount);
  }
}
```

#### In CommonJS (`require`):
```javascript
const { Cache, Log, Retry } = require('@thekosmix/node-decorators');
```

### Step 5: (Optional) Connect Redis or File Logging

```typescript
import Redis from 'ioredis';
import { CacheManager, RedisCacheStore, LoggerManager } from '@thekosmix/node-decorators';

// Connect Redis (enables both Redis Caching and Redis Distributed Locking)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
CacheManager.registerStore('redis', new RedisCacheStore(redis));

// Enable disk file logging
LoggerManager.enableFileLogging('./logs/app.log', 'json');
```

### Testing Locally in Another Project via `npm link`

1. In `node-decorators`:
   ```bash
   npm run build
   npm link
   ```
2. In your consumer project:
   ```bash
   npm link @thekosmix/node-decorators
   ```

---

## How to Test & Build

### Running the Test Suite

```bash
# Run all 20 test suites (70 unit & integration tests)
npm test

# Run tests in interactive watch mode
npm run test:watch
```

### Running Specific Test Specs

```bash
npx vitest tests/lock.spec.ts
npx vitest tests/circuit-breaker.spec.ts
npx vitest tests/idempotent.spec.ts
npx vitest tests/transactional.spec.ts
npx vitest tests/validate.spec.ts
npx vitest tests/authorize.spec.ts
npx vitest tests/audit.spec.ts
npx vitest tests/feature-flag.spec.ts
npx vitest tests/single-flight.spec.ts
npx vitest tests/debounce.spec.ts
```

### Running the Sample Demo Runner

```bash
npx ts-node test.ts
```

### Building for Production (ESM + CommonJS + Types)

```bash
npm run build
```

Generates:
- `dist/index.js` (CommonJS bundle)
- `dist/index.mjs` (ES Module bundle)
- `dist/index.d.ts` & `dist/index.d.mts` (Complete TypeScript typings)

### Verifying the npm Package

```bash
npm pack --dry-run
```

---

## Features & API Reference

### 1. Caching Suite

Supports multiple named stores, asynchronous and synchronous execution, automatic bucket partitioning, and custom key generation.

#### In-Memory Caching (Default)
```typescript
import { Cache } from '@thekosmix/node-decorators';

class ProductService {
  @Cache('products')
  getProduct(id: string) {
    return db.products.findById(id);
  }
}
```

#### Redis Caching
```typescript
import Redis from 'ioredis';
import { Cache, CacheManager, RedisCacheStore } from '@thekosmix/node-decorators';

CacheManager.registerStore('redis', new RedisCacheStore(new Redis()));

class OrderService {
  @Cache({ store: 'redis', bucket: 'orders', ttl: 600 })
  async getOrder(orderId: string) {
    return db.orders.findById(orderId);
  }
}
```

#### Cache Eviction & Updates
```typescript
import { Cache, CacheEvict, CachePut } from '@thekosmix/node-decorators';

class UserService {
  @Cache('users')
  getUser(id: string) { ... }

  @CachePut({ bucket: 'users', keyGenerator: (user) => user.id })
  updateUser(user: { id: string; name: string }) { ... }

  @CacheEvict('users')
  deleteUser(id: string) { ... }

  @CacheEvict({ bucket: 'users', allEntries: true })
  flushUserCache() {}
}
```

---

### 2. Logging Suite

The `@Log` decorator captures invocation arguments, execution duration (`[12.45ms]`), return values, and exceptions with stack traces.

```typescript
import { Log, LoggerManager } from '@thekosmix/node-decorators';

// Optional: Enable disk logs or external logger
LoggerManager.enableFileLogging('./logs/app.log', 'json');

class AuthService {
  @Log({ maskParams: ['password', 'token'] })
  login(payload: { username: string; password: string }) { ... }
}
```

---

### 3. Resiliency Suite

#### `@Retry`
Retries failed operations with configurable attempts, delays, and exponential backoff:
```typescript
import { Retry } from '@thekosmix/node-decorators';

class ExternalApi {
  @Retry({ maxAttempts: 3, delayMs: 200, backoffMultiplier: 2 })
  async callWebhook(payload: any) { ... }
}
```

#### `@Timeout`
Aborts and rejects with `TimeoutError` if a method takes longer than the threshold:
```typescript
import { Timeout } from '@thekosmix/node-decorators';

class SearchService {
  @Timeout(3000)
  async searchIndex(query: string) { ... }
}
```

#### `@RateLimit`
Enforces sliding window call limits globally or per user:
```typescript
import { RateLimit } from '@thekosmix/node-decorators';

class NotificationService {
  @RateLimit({ maxCalls: 5, windowMs: 60000, keyGenerator: (userId) => userId })
  sendPush(userId: string, message: string) { ... }
}
```

---

### 4. Distributed Systems & Concurrency

#### `@Lock`
Distributed mutex across processes (via Redis atomic `SET NX PX` and Lua unlock) or in-memory Promise queue:
```typescript
import { Lock } from '@thekosmix/node-decorators';

class PaymentService {
  @Lock({ key: (userId) => `payment:${userId}`, ttlMs: 5000, wait: true })
  async processPayment(userId: string, amount: number) {
    // Guaranteed single-execution across distributed workers
  }
}
```

#### `@CircuitBreaker`
Fail-fast protection against cascading downstream outages:
```typescript
import { CircuitBreaker } from '@thekosmix/node-decorators';

class RecommendationService {
  @CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 10000,
    fallback: () => ({ cached: true, items: [] }),
  })
  async getRemoteRecommendations(userId: string) {
    return remoteClient.fetch(userId);
  }
}
```

---

### 5. API & Data Integrity

#### `@Idempotent`
Prevents duplicate processing of retried network calls or duplicate webhooks:
```typescript
import { Idempotent } from '@thekosmix/node-decorators';

class CheckoutService {
  @Idempotent({ keyGenerator: (orderId) => orderId, ttlSeconds: 86400 })
  async chargeOrder(orderId: string, amount: number) {
    // If called twice with the same orderId, returns the cached result without charging again
  }
}
```

#### `@Transactional`
Automated database transaction management with atomic commit and rollback on error, propagated via Node.js `AsyncLocalStorage`:
```typescript
import { Transactional, TransactionManager } from '@thekosmix/node-decorators';

// Setup your ORM/query runner provider once
TransactionManager.setProvider({
  beginTransaction: () => db.startTransaction(),
  commit: (tx) => tx.commit(),
  rollback: (tx) => tx.rollback(),
});

class AccountService {
  @Transactional()
  async transfer(fromId: string, toId: string, amount: number) {
    const tx = TransactionManager.getTransaction();
    await db.debit(fromId, amount, tx);
    await db.credit(toId, amount, tx);
  }
}
```

---

### 6. Security & Governance

#### `@Authorize` & `@Roles`
Declarative role-based access control and permission checking:
```typescript
import { Authorize, Roles, SecurityContext } from '@thekosmix/node-decorators';

class DocumentService {
  @Roles('ADMIN', 'EDITOR')
  editDocument(docId: string) { ... }

  @Authorize({ permissions: ['docs:publish'] })
  publishDocument(docId: string) { ... }
}
```

#### `@Audit`
Automatic compliance audit logging:
```typescript
import { Audit, AuditManager } from '@thekosmix/node-decorators';

AuditManager.setHandler(async (record) => {
  await auditDb.insert(record);
});

class AdminService {
  @Audit({ action: 'PROMOTE_USER', actor: (adminId) => adminId, target: (_, userId) => userId })
  promoteUser(adminId: string, userId: string, newRole: string) { ... }
}
```

#### `@FeatureFlag`
Dynamic feature toggling and fallback routing:
```typescript
import { FeatureFlag, FeatureFlagManager } from '@thekosmix/node-decorators';

FeatureFlagManager.setFlag('v2-pricing', true);

class BillingService {
  @FeatureFlag('v2-pricing', { fallback: () => 100 })
  calculatePricing(plan: string) {
    return 150;
  }
}
```

---

### 7. Traffic Management & Performance

#### `@SingleFlight`
Coalesces concurrent in-flight calls for identical keys into a single execution to prevent the "thundering herd" problem:
```typescript
import { SingleFlight } from '@thekosmix/node-decorators';

class NewsService {
  @SingleFlight((articleId) => articleId)
  async getTrendingArticle(articleId: string) {
    // 50 simultaneous callers will only execute this query once!
    return db.queryArticle(articleId);
  }
}
```

#### `@Debounce` & `@Throttle`
```typescript
import { Debounce, Throttle } from '@thekosmix/node-decorators';

class EditorService {
  @Debounce(300)
  autoSave(document: any) { ... }

  @Throttle(1000)
  syncCursor(position: any) { ... }
}
```

---

### 8. Validation, Diagnostics & Fallback

- **`@Validate(schema)`**: Validates arguments before execution (supports Zod, Joi, or custom predicates).
- **`@Timed()` / `@MeasureTime()`**: High-precision execution duration tracking.
- **`@Catch(handler)` & `@Fallback(value)`**: Intercept exceptions and return graceful fallbacks without `try/catch`.
- **`@Length(min, max)`**: Validates property length constraints.
- **`@Async`**: Defer method execution to the next event loop tick and return a Promise.
- **`@Rest`**: Expose methods as REST endpoints with `startRestServer(3000)`.

---

## License

[MIT](LICENSE)
