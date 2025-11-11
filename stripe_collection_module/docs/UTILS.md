# Utility Functions

This directory contains reusable utility functions and helpers used throughout the collection module.

## Files

### `error.ts`
Simple error class for collection module errors.

**Usage:**
```typescript
import ModuleError from './utils/error';

throw new ModuleError('Payment failed', { policyId: '123' });
```

### `error-types.ts`
Enhanced error types with categorization and retry logic.

**Classes:**
- `EnhancedModuleError` - Base error with request tracking
- `ValidationError` - Input validation errors
- `NotFoundError` - Resource not found errors
- `NetworkError` - Network/connectivity errors (retryable)
- `TimeoutError` - Timeout errors (retryable)
- `RateLimitError` - Rate limit errors (retryable)
- `ServerError` - Server-side errors (retryable)

**Functions:**
- `categorizeError()` - Categorize any error
- `isRetryableError()` - Check if error should be retried
- `formatErrorForLogging()` - Format error for logs

**Usage:**
```typescript
import { ValidationError, NetworkError } from './utils/error-types';

// Non-retryable validation error
throw new ValidationError('Invalid email', { email: user.email });

// Retryable network error
throw new NetworkError('Connection failed', { url: apiUrl });
```

### `retry.ts`
Retry logic with exponential backoff and jitter.

**Usage:**
```typescript
import { retryWithBackoff } from './utils/retry';

const result = await retryWithBackoff(
  () => stripeClient.getCustomer(customerId),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    shouldRetry: (error) => error.statusCode >= 500,
  }
);
```

### `timeout.ts`
Add timeout to async operations.

**Usage:**
```typescript
import { withTimeout } from './utils/timeout';

const result = await withTimeout(
  slowOperation(),
  5000, // 5 second timeout
  'Operation timed out'
);
```

### `logger.ts`
Legacy logger (kept for backwards compatibility).

**Note:** New code should use `LogService` from the DI container instead.

```typescript
// ❌ Old approach
import Logger from './utils/logger';
Logger.info('message');

// ✅ New approach
const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);
logService.info('message', 'ComponentName', { context });
```

### `index.ts`
Re-exports commonly used utilities for convenience.

**Usage:**
```typescript
// Import from utils directly
import { 
  ModuleError,
  retryWithBackoff,
  withTimeout 
} from './utils';
```

## Best Practices

### 1. Use Enhanced Errors for Better Error Handling

```typescript
// ✅ Good - specific error type
throw new ValidationError('Invalid amount', { amount });

// ❌ Bad - generic error
throw new Error('Invalid amount');
```

### 2. Add Retry Logic for External APIs

```typescript
// ✅ Good - retry on transient failures
const customer = await retryWithBackoff(
  () => stripeClient.customers.retrieve(customerId),
  { maxRetries: 3 }
);

// ❌ Bad - no retry, fails on transient errors
const customer = await stripeClient.customers.retrieve(customerId);
```

### 3. Add Timeouts for Long Operations

```typescript
// ✅ Good - timeout prevents hanging
const result = await withTimeout(
  externalApiCall(),
  30000 // 30 second timeout
);

// ❌ Bad - could hang indefinitely
const result = await externalApiCall();
```

## Examples

### Error Handling with Retry

```typescript
import { retryWithBackoff, NetworkError, isRetryableError } from './utils';

try {
  const result = await retryWithBackoff(
    async () => {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new NetworkError('API call failed', { 
          status: response.status 
        });
      }
      return response.json();
    },
    {
      maxRetries: 3,
      shouldRetry: (error) => isRetryableError(error),
    }
  );
} catch (error) {
  logService.error('Failed after retries', 'ServiceName', {
    error: formatErrorForLogging(error),
  });
  throw error;
}
```

## Related Documentation

- [Error Handling Best Practices](../../docs/BEST_PRACTICES.md)
- [Testing Guide](../../docs/TESTING.md)
- [Architecture](../../docs/ARCHITECTURE.md)

