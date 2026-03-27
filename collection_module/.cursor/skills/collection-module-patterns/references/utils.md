# Utils (Reference)

## error.ts

`ModuleError`: `throw new ModuleError('Payment failed', { policyId: '123' });`

## error-types.ts

- **EnhancedModuleError** — base with request tracking
- **ValidationError** — input validation (non-retryable)
- **NotFoundError** — resource not found
- **NetworkError**, **TimeoutError**, **RateLimitError**, **ServerError** — retryable
- **categorizeError()**, **isRetryableError()**, **formatErrorForLogging()**

Use specific types for better handling and retry decisions.

## retry.ts

`retryWithBackoff(fn, { maxRetries, initialDelay, maxDelay, shouldRetry })` — use for external API calls.

## timeout.ts

`withTimeout(promise, ms, message)` — wrap long operations.

## logger.ts

Legacy. Prefer LogService from DI for new code.

## Best Practices

Use enhanced errors, retry for transient failures, timeouts for external calls. Import from `./utils` or specific files.
