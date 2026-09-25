import 'reflect-metadata';

// Core Decorators
export { Cache, CacheEvict, CachePut } from './decorators/cache';
export { Log } from './decorators/log';
export { Retry } from './decorators/retry';
export type { RetryOptions } from './decorators/retry';
export { Timeout, TimeoutError } from './decorators/timeout';
export { RateLimit, RateLimitError } from './decorators/ratelimit';
export type { RateLimitOptions } from './decorators/ratelimit';
export { Timed, MeasureTime } from './decorators/timed';
export type { TimedCallback } from './decorators/timed';
export { Catch, Fallback } from './decorators/catch';
export type { ErrorHandler, ErrorConstructor } from './decorators/catch';
export { Length } from './decorators/length';
export { Async } from './decorators/async';
export { Rest, getRestApp, startRestServer, stopRestServer } from './decorators/rest';
export type { RestRouteOptions } from './decorators/rest';

// Enterprise Decorators
export { Lock, LockAcquisitionError, MemoryLockManager } from './decorators/lock';
export type { LockOptions } from './decorators/lock';
export { CircuitBreaker, CircuitBreakerOpenError, CircuitBreakerManager } from './decorators/circuit-breaker';
export type { CircuitBreakerOptions, CircuitState } from './decorators/circuit-breaker';
export { Idempotent, IdempotencyConflictError } from './decorators/idempotent';
export type { IdempotentOptions } from './decorators/idempotent';
export { Transactional, TransactionManager } from './decorators/transactional';
export type { ITransactionProvider } from './decorators/transactional';
export { Validate, ValidationError } from './decorators/validate';
export type { ValidationTarget, ValidatorFunction, SchemaValidator } from './decorators/validate';
export { Authorize, Roles, UnauthorizedError, ForbiddenError, SecurityContext } from './decorators/authorize';
export type { AuthorizeOptions } from './decorators/authorize';
export { Audit, AuditManager } from './decorators/audit';
export type { AuditRecord, AuditHandler, AuditOptions } from './decorators/audit';
export { FeatureFlag, FeatureDisabledError, FeatureFlagManager } from './decorators/feature-flag';
export type { FeatureFlagProvider, FeatureFlagOptions } from './decorators/feature-flag';
export { SingleFlight } from './decorators/single-flight';
export type { SingleFlightKeyGenerator } from './decorators/single-flight';
export { Debounce, Throttle } from './decorators/debounce';
export type { DebounceOptions, ThrottleOptions } from './decorators/debounce';

// Cache System
export { CacheManager } from './cache/manager';
export { MemoryCacheStore } from './cache/memory-store';
export type { MemoryStoreOptions } from './cache/memory-store';
export { RedisCacheStore } from './cache/redis-store';
export type { RedisStoreOptions, MinimalRedisClient } from './cache/redis-store';
export type { ICacheStore, CacheOptions, CacheEvictOptions, CachePutOptions } from './cache/types';

// Logger System
export { LoggerManager } from './logger/manager';
export { ConsoleTransport, FileTransport, CustomLoggerTransport } from './logger/transports';
export type { FileTransportOptions } from './logger/transports';
export type { ILogTransport, LogOptions, LogEntry, LogLevel } from './logger/types';