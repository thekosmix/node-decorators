# @thekosmix/node-decorators

> A production-grade, Spring-Boot-inspired TypeScript decorator suite for Node.js. Carve out boilerplate like caching (In-Memory & Redis), logging, resiliency, metrics, validation, and API exposure with clean annotations.

[![npm version](https://img.shields.io/npm/v/@thekosmix/node-decorators.svg)](https://www.npmjs.com/package/@thekosmix/node-decorators)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
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
    - [In-Memory Caching](#in-memory-caching)
    - [Redis Caching](#redis-caching)
    - [Cache Eviction & Updates](#cache-eviction--updates)
  - [2. Logging Suite (@Log)](#2-logging-suite)
    - [File Logging](#file-logging)
    - [External Logger Integration (Winston / Pino)](#external-logger-integration)
    - [Parameter Masking](#parameter-masking)
  - [3. Resiliency Suite (@Retry, @Timeout, @RateLimit)](#3-resiliency-suite)
  - [4. Performance & Metrics (@Timed / @MeasureTime)](#4-performance--metrics)
  - [5. Error Handling & Recovery (@Catch, @Fallback)](#5-error-handling--recovery)
  - [6. Validation & Async Execution (@Length, @Async, @Rest)](#6-validation--async-execution)
- [License](#license)

---

## Overview

In Java's Spring Boot ecosystem, developers use annotations to separate cross-cutting concerns (caching, logging, retries, rate limits) from business logic. `node-decorators` brings that exact ergonomic power to TypeScript and Node.js.

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
import { Cache, Log, Retry } from '@thekosmix/node-decorators';

class UserService {
  @Cache({ store: 'redis', bucket: 'users', ttl: 3600 })
  @Log()
  @Retry({ maxAttempts: 3 })
  async getUsernameById(userId: string) {
    const user = await UserModel.findById(userId);
    return user.name;
  }
}
```

---

## How to Use in an Existing Node.js Project

Follow these steps to integrate `node-decorators` into your existing Node.js & TypeScript application.

### Step 1: Install the Package

Install the library and `reflect-metadata`:

```bash
npm install @thekosmix/node-decorators reflect-metadata
```

If you plan to use Redis caching, install `ioredis`:

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

> **Note:** `"useDefineForClassFields": false` ensures property decorators (such as `@Length`) can validate assignments without being shadowed by instance fields.

### Step 3: Initialize `reflect-metadata` at Application Entry

Import `reflect-metadata` once at the very top of your application entry file (`index.ts`, `server.ts`, `app.ts`):

```typescript
// src/index.ts or server.ts
import 'reflect-metadata';
```

### Step 4: Use Decorators in Your Services (ESM & CommonJS)

#### In ES Modules (`import`):
```typescript
import { Cache, Log, Retry, Timeout, RateLimit } from '@thekosmix/node-decorators';

export class OrderService {
  @Cache('orders')
  @Log()
  @Retry({ maxAttempts: 3, delayMs: 200 })
  async getOrder(orderId: string) {
    return database.findOrder(orderId);
  }

  @RateLimit({ maxCalls: 5, windowMs: 60000 })
  @Timeout(5000)
  async processPayment(orderId: string, amount: number) {
    return paymentGateway.charge(orderId, amount);
  }
}
```

#### In CommonJS (`require`):
```javascript
const { Cache, Log, Retry } = require('@thekosmix/node-decorators');

class OrderService {
  // Can be used with TypeScript or Babel decorator plugins
}
```

### Step 5: (Optional) Connect Redis or File Logging

To switch `@Cache` to Redis globally or per-decorator, initialize your store in your bootstrap script:

```typescript
import Redis from 'ioredis';
import { CacheManager, RedisCacheStore, LoggerManager } from '@thekosmix/node-decorators';

// 1. Setup Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
CacheManager.registerStore('redis', new RedisCacheStore(redis));

// (Optional) Make Redis the default store for all @Cache decorators:
// CacheManager.setDefaultStore('redis');

// 2. Setup File Logging
LoggerManager.enableFileLogging('./logs/app.log', 'json');
```

### Testing Locally in Another Project via `npm link`

To test this package in a separate local project before publishing to npm:

1. In the `node-decorators` root directory:
   ```bash
   npm run build
   npm link
   ```

2. In your existing consumer project directory:
   ```bash
   npm link @thekosmix/node-decorators
   ```

You can now import and use `@thekosmix/node-decorators` just like an installed npm module!

---

## How to Test & Build

### Running the Test Suite

The project uses [Vitest](https://vitest.dev/) for high-speed, zero-config TypeScript unit and integration testing:

```bash
# Run all 10 test suites (37 unit & integration tests)
npm test

# Run tests in interactive watch mode during development
npm run test:watch
```

### Running Specific Test Specs

You can target individual test files:

```bash
# Test caching logic
npx vitest tests/cache.spec.ts

# Test Redis integration (with ioredis-mock)
npx vitest tests/redis-cache.spec.ts

# Test logging and file transports
npx vitest tests/log.spec.ts

# Test resiliency decorators
npx vitest tests/retry.spec.ts
npx vitest tests/timeout.spec.ts
npx vitest tests/ratelimit.spec.ts
```

### Running the Sample Demo Runner

Run the provided end-to-end sample script with `ts-node`:

```bash
npx ts-node test.ts
```

Output demonstrates real-time formatted logging, execution timing, cache misses, and cache hits across multiple services.

### Building for Production (ESM + CommonJS + Types)

We use [tsup](https://tsup.egoist.dev/) to build zero-overhead dual bundles with TypeScript declaration maps:

```bash
npm run build
```

This generates:
- `dist/index.js` (CommonJS bundle)
- `dist/index.mjs` (ES Module bundle)
- `dist/index.d.ts` & `dist/index.d.mts` (Complete TypeScript typings)
- Source maps for both bundles

### Verifying the npm Package

Inspect what will be included in the npm package tarball without actually publishing:

```bash
npm pack --dry-run
```

This confirms that only production distribution files (`dist/`), `README.md`, and `LICENSE` are included.

---

## Features & API Reference

### 1. Caching Suite

The caching engine supports multiple named stores with asynchronous and synchronous support, automatic bucket partitioning, and custom key generation.

#### In-Memory Caching
By default, `@Cache` uses an in-memory store backed by `node-cache`.

```typescript
import { Cache } from '@thekosmix/node-decorators';

class ProductService {
  // Simple bucket caching
  @Cache('products')
  getProduct(id: string) {
    return db.products.findById(id);
  }

  // Configured TTL and custom key generator
  @Cache({
    bucket: 'products',
    ttl: 300, // 5 minutes
    keyGenerator: (query) => `search_${query.term}_${query.page}`,
  })
  search(query: { term: string; page: number }) {
    return db.products.search(query);
  }
}
```

#### Redis Caching
Register a Redis store using `CacheManager`:

```typescript
import Redis from 'ioredis';
import { Cache, CacheManager, RedisCacheStore } from '@thekosmix/node-decorators';

// Connect your Redis client
const redisClient = new Redis('redis://localhost:6379');

// Register the store
CacheManager.registerStore('redis', new RedisCacheStore(redisClient));

// (Optional) Make Redis the default store for all @Cache decorators
// CacheManager.setDefaultStore('redis');

class OrderService {
  @Cache({ store: 'redis', bucket: 'orders', ttl: 600 })
  async getOrder(orderId: string) {
    return db.orders.findById(orderId);
  }
}
```

#### Cache Eviction & Updates

- `@CacheEvict`: Invalidates a single entry or the entire bucket upon method success.
- `@CachePut`: Always executes the method and updates the cache value with the return result.

```typescript
import { Cache, CacheEvict, CachePut } from '@thekosmix/node-decorators';

class UserService {
  @Cache('users')
  getUser(id: string) {
    return db.users.find(id);
  }

  @CachePut({ bucket: 'users', keyGenerator: (user) => user.id })
  updateUser(user: { id: string; name: string }) {
    return db.users.update(user);
  }

  // Evict specific key
  @CacheEvict('users')
  deleteUser(id: string) {
    return db.users.delete(id);
  }

  // Evict all entries in bucket
  @CacheEvict({ bucket: 'users', allEntries: true })
  flushUserCache() {}
}
```

---

### 2. Logging Suite

The `@Log` decorator automatically captures:
- Invocation arguments
- Execution time in milliseconds (`[12.45ms]`)
- Return values
- Uncaught exceptions and stack traces

```typescript
import { Log } from '@thekosmix/node-decorators';

class PaymentService {
  @Log()
  async processPayment(orderId: string, amount: number) {
    return { status: 'PAID' };
  }
}
```

#### File Logging
Easily route logs to a disk file in text or JSON format:

```typescript
import { LoggerManager } from '@thekosmix/node-decorators';

// Appends structured JSON logs to app.log
LoggerManager.enableFileLogging('./logs/app.log', 'json');
```

#### External Logger Integration
Pipe log entries directly to Winston, Pino, or any custom logger:

```typescript
import winston from 'winston';
import { LoggerManager } from '@thekosmix/node-decorators';

const logger = winston.createLogger({ ... });
LoggerManager.setCustomLogger(logger);
```

#### Parameter Masking
Avoid leaking sensitive data (passwords, tokens, card numbers):

```typescript
class AuthService {
  @Log({ maskParams: ['password', 'token'] })
  login(payload: { username: string; password: string }) {
    // Arguments in logs will display password as '***MASKED***'
  }
}
```

---

### 3. Resiliency Suite

#### `@Retry`
Automatically retries failed asynchronous or synchronous operations with exponential backoff and error filtering:

```typescript
import { Retry } from '@thekosmix/node-decorators';

class ExternalApi {
  @Retry({
    maxAttempts: 3,
    delayMs: 200,
    backoffMultiplier: 2,
    retryIf: (err) => err.isNetworkError,
  })
  async callWebhook(payload: any) {
    return http.post('/webhook', payload);
  }
}
```

#### `@Timeout`
Aborts and rejects with `TimeoutError` if a method takes longer than the threshold:

```typescript
import { Timeout, TimeoutError } from '@thekosmix/node-decorators';

class SearchService {
  @Timeout(3000, 'Search request timed out after 3 seconds')
  async searchIndex(query: string) {
    return esClient.search(query);
  }
}
```

#### `@RateLimit`
Enforces sliding window call limits globally or per user:

```typescript
import { RateLimit, RateLimitError } from '@thekosmix/node-decorators';

class NotificationService {
  // Max 5 calls per 60 seconds per user
  @RateLimit({
    maxCalls: 5,
    windowMs: 60000,
    keyGenerator: (userId: string) => userId,
    message: 'Too many notifications requested. Please wait.',
  })
  sendPush(userId: string, message: string) {
    // ...
  }
}
```

---

### 4. Performance & Metrics

#### `@Timed` / `@MeasureTime`
Tracks execution duration and dispatches to a custom metrics handler or console:

```typescript
import { Timed } from '@thekosmix/node-decorators';

class AnalyticsService {
  @Timed((durationMs, method, args) => {
    metricsClient.timing(`service.${method}`, durationMs);
  })
  async generateDailyReport() {
    // ...
  }
}
```

---

### 5. Error Handling & Recovery

#### `@Catch` & `@Fallback`
Intercept errors and provide graceful degradation or fallback values without polluting your business methods with `try/catch` blocks:

```typescript
import { Catch, Fallback } from '@thekosmix/node-decorators';

class FeedService {
  // Return a static or dynamic fallback on failure
  @Fallback({ feed: [], status: 'cached-fallback' })
  async getFeed(userId: string) {
    return externalFeed.fetch(userId);
  }

  // Intercept error and transform
  @Catch((err, userId) => ({ error: err.message, userId }))
  getUserSafely(userId: string) {
    // ...
  }
}
```

---

### 6. Validation & Async Execution

#### `@Length`
Validates string or array property length on class instantiation and assignment:

```typescript
import { Length } from '@thekosmix/node-decorators';

class UserRegistration {
  @Length(3, 20)
  username: string;

  @Length(1, 5)
  roles: string[];
}
```

#### `@Async`
Defers method execution to the next event loop tick (`setImmediate`/`setTimeout`) and returns a Promise:

```typescript
import { Async } from '@thekosmix/node-decorators';

class EmailService {
  @Async
  sendWelcomeEmail(email: string) {
    // Runs in the background without blocking the caller
  }
}
```

#### `@Rest`
Exposes class methods as Express REST endpoints based on naming conventions:
- `getX(...)` &rarr; `GET /api/x`
- `addX(...)` / `updateX(...)` &rarr; `POST /api/x`
- `deleteX(...)` / `removeX(...)` &rarr; `DELETE /api/x`

```typescript
import { Rest, startRestServer } from '@thekosmix/node-decorators';

class UserController {
  @Rest
  getUser(id: string) {
    return { id, name: 'Alice' };
  }

  @Rest
  addUser(userData: any) {
    return { ...userData, id: '123' };
  }
}

// Start the server when ready
startRestServer(3000);
```

---

## License

[MIT](LICENSE)
