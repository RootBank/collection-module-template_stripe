# Testing Guide

This guide explains how to test the collection module effectively.

## Overview

We use **Jest** with **TypeScript** for unit testing. The testing infrastructure is designed to make tests easy to write, read, and maintain.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm test:watch

# Run tests with coverage report
npm test:coverage

# Run specific test file
npm test -- log.service.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="LogService"
```

**Important**: Always run `nvm use` first to switch to Node 18+, as specified in `.nvmrc`.

## Test Structure

### Directory Organization

```
__tests__/
├── core/                   # Core functionality tests
│   └── container.test.ts
├── services/               # Service tests
│   ├── log.service.test.ts
│   └── render.service.test.ts
├── lifecycle-hooks/        # Lifecycle hook tests
│   └── render-logs.test.ts
├── helpers/                # Test utilities
│   ├── test-utils.ts      # Helper functions
│   └── factories.ts       # Mock data factories
└── setup.ts                # Global test setup
```

### Test File Naming

- Test files: `*.test.ts`
- Place tests adjacent to code: `__tests__/services/my-service.test.ts`
- Match source file names: `log.service.ts` → `log.service.test.ts`

## Writing Tests

### Basic Test Structure

```typescript
import { MyService } from '../../code/services/my-service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    // Setup - runs before each test
    service = new MyService();
  });

  afterEach(() => {
    // Cleanup - runs after each test
    jest.restoreAllMocks();
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = service.methodName(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

### Testing with Dependencies

Use the DI container for easy mocking:

```typescript
import { Container, ServiceToken } from '../../code/core/container';
import { MyService } from '../../code/services/my-service';
import { LogService } from '../../code/services/log.service';

describe('MyService with Dependencies', () => {
  let container: Container;
  let mockLogService: jest.Mocked<LogService>;
  let myService: MyService;

  beforeEach(() => {
    // Create isolated container for testing
    container = new Container();

    // Create mock log service
    mockLogService = {
      info: jest.fn(),
      error: jest.fn(),
      // ... other methods
    } as any;

    // Register mock
    container.register(
      ServiceToken.LOG_SERVICE,
      () => mockLogService,
      ServiceLifetime.SINGLETON
    );

    // Get service under test
    myService = new MyService(
      container.resolve(ServiceToken.LOG_SERVICE)
    );
  });

  it('should log when processing', () => {
    myService.process();
    
    expect(mockLogService.info).toHaveBeenCalledWith(
      'Processing started',
      'MyService'
    );
  });
});
```

### Using Test Factories

We provide factory functions for creating mock data:

```typescript
import { 
  createMockStripeCustomer,
  createMockRootPolicy,
  createMockRootPayment
} from '../helpers/factories';

it('should process payment', () => {
  // Create mock data easily
  const customer = createMockStripeCustomer({
    email: 'test@example.com'
  });

  const policy = createMockRootPolicy({
    monthly_premium: 10000
  });

  // Test with mock data
  const result = service.processPayment(customer, policy);
  expect(result).toBeDefined();
});
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const promise = service.asyncMethod();
  
  await expect(promise).resolves.toBe('success');
});

it('should handle errors', async () => {
  const promise = service.failingMethod();
  
  await expect(promise).rejects.toThrow('Expected error');
});
```

### Mocking External APIs

```typescript
import StripeClient from '../../code/clients/stripe-client';

jest.mock('../../code/clients/stripe-client');

describe('Service with Stripe', () => {
  let mockStripeClient: jest.Mocked<StripeClient>;

  beforeEach(() => {
    mockStripeClient = {
      stripeSDK: {
        customers: {
          create: jest.fn().mockResolvedValue({
            id: 'cus_123',
            email: 'test@example.com'
          })
        }
      }
    } as any;
  });

  it('should create customer', async () => {
    const result = await service.createCustomer('test@example.com');
    
    expect(mockStripeClient.stripeSDK.customers.create).toHaveBeenCalled();
    expect(result.id).toBe('cus_123');
  });
});
```

### Testing Console Output

The LogService outputs to console, which you may want to verify:

```typescript
it('should log to console', () => {
  const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
  
  logService.info('Test message');
  
  expect(consoleSpy).toHaveBeenCalled();
  const logOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
  expect(logOutput.message).toBe('Test message');
  
  consoleSpy.mockRestore();
});
```

## Test Utilities

### Available Helpers

Located in `__tests__/helpers/test-utils.ts`:

```typescript
import { wait, mockTimers, createMockFn } from '../helpers/test-utils';

// Wait for a specific time
await wait(1000);

// Mock timers
mockTimers.enable();
mockTimers.advance(1000);
mockTimers.runAll();
mockTimers.disable();

// Create type-safe mock functions
const mockFn = createMockFn<(x: number) => string>();
```

### Factory Functions

Located in `__tests__/helpers/factories.ts`:

- `createMockStripeCustomer()`
- `createMockStripePaymentMethod()`
- `createMockStripeSubscription()`
- `createMockStripeInvoice()`
- `createMockRootPolicy()`
- `createMockRootPaymentMethod()`
- `createMockRootPayment()`

## Testing Best Practices

### 1. Test Behavior, Not Implementation

❌ **Bad**: Testing implementation details
```typescript
it('should call private method', () => {
  const spy = jest.spyOn(service as any, '_privateMethod');
  service.publicMethod();
  expect(spy).toHaveBeenCalled();
});
```

✅ **Good**: Testing observable behavior
```typescript
it('should return processed result', () => {
  const result = service.publicMethod();
  expect(result).toEqual({ processed: true });
});
```

### 2. Use Descriptive Test Names

❌ **Bad**: Vague test names
```typescript
it('works', () => { ... });
it('test 1', () => { ... });
```

✅ **Good**: Descriptive test names
```typescript
it('should create customer when email is provided', () => { ... });
it('should throw error when policy ID is invalid', () => { ... });
```

### 3. Follow AAA Pattern

Always structure tests with Arrange, Act, Assert:

```typescript
it('should calculate total', () => {
  // Arrange - Set up test data
  const items = [{ price: 100 }, { price: 200 }];
  
  // Act - Execute the code under test
  const total = service.calculateTotal(items);
  
  // Assert - Verify the result
  expect(total).toBe(300);
});
```

### 4. Test One Thing at a Time

❌ **Bad**: Testing multiple things
```typescript
it('should create and update customer', () => {
  const customer = service.create();
  expect(customer).toBeDefined();
  
  const updated = service.update(customer.id, { name: 'New' });
  expect(updated.name).toBe('New');
});
```

✅ **Good**: Separate tests
```typescript
it('should create customer', () => {
  const customer = service.create();
  expect(customer).toBeDefined();
});

it('should update customer name', () => {
  const customer = service.create();
  const updated = service.update(customer.id, { name: 'New' });
  expect(updated.name).toBe('New');
});
```

### 5. Don't Test External Libraries

Don't test Stripe SDK, Root SDK, or other external libraries. Test YOUR code:

❌ **Bad**: Testing Stripe SDK
```typescript
it('should call Stripe API', () => {
  expect(stripe.customers.create).toBeDefined();
});
```

✅ **Good**: Testing your service
```typescript
it('should create customer using Stripe', async () => {
  mockStripe.customers.create.mockResolvedValue({ id: 'cus_123' });
  
  const customer = await service.createCustomer('test@example.com');
  
  expect(customer.id).toBe('cus_123');
});
```

### 6. Isolate Tests

Each test should be independent:

```typescript
// Good - each test creates its own data
beforeEach(() => {
  service = new MyService();
});

it('test 1', () => {
  const data = createTestData();
  // use data
});

it('test 2', () => {
  const data = createTestData();
  // use data
});
```

## Coverage Goals

Aim for:
- **70%+ overall coverage**
- **80%+ for services**
- **90%+ for critical paths** (payment processing, webhook handling)

Check coverage:
```bash
npm test:coverage
```

View HTML report:
```bash
open coverage/lcov-report/index.html
```

## Debugging Tests

### Run Single Test

```bash
# Run specific test file
npm test -- log.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should log debug"
```

### Debug in VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

## Common Issues

### Issue: Tests timing out

**Solution**: Increase timeout
```typescript
jest.setTimeout(10000); // 10 seconds
```

### Issue: Async tests not waiting

**Solution**: Always use `async/await` or return promises
```typescript
it('should work', async () => {
  await service.asyncMethod(); // Don't forget await!
});
```

### Issue: Mock not working

**Solution**: Ensure mock is set up before test runs
```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear previous mock calls
  mockService.method.mockResolvedValue('result');
});
```

## Next Steps

1. Write tests for new features as you implement them
2. Maintain >70% coverage
3. Run tests before committing
4. Review test failures carefully - they often catch real bugs!

## Questions?

- Check existing tests for examples
- See Jest documentation: https://jestjs.io/
- Ask in team chat




