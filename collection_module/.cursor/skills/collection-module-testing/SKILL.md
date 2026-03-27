---
name: collection-module-testing
description: Testing the Stripe Collection Module with Jest and TypeScript. Use when writing unit tests, mocking services and clients, running tests, checking coverage, or following test structure and patterns for this project.
---

# Collection Module Testing

## Running Tests

Run `nvm use` first (Node 18+ per `.nvmrc`).

```bash
npm test
npm run test:watch
npm run test:coverage
npm test -- log.service.test.ts
npm test -- --testNamePattern="LogService"
```

## Test Structure

- **Location**: `__tests__/` mirroring `code/` (core/, services/, lifecycle-hooks/, helpers/).
- **Naming**: `*.test.ts`; match source (e.g. `log.service.ts` → `log.service.test.ts`).
- **Helpers**: `__tests__/helpers/test-utils.ts`, `factories.ts` (createMockStripeCustomer, createMockRootPolicy, createMockRootPayment, etc.).

## Writing Tests

### Basic structure

```typescript
describe('MyService', () => {
  let service: MyService;
  beforeEach(() => { service = new MyService(); });
  afterEach(() => { jest.restoreAllMocks(); });
  describe('methodName', () => {
    it('should do something specific', () => {
      const result = service.methodName(input);
      expect(result).toBe('expected');
    });
  });
});
```

### With dependencies (DI or direct mocks)

- **Container**: Create Container, register mocks with ServiceToken, resolve service under test.
- **Direct**: `new MyService(mockLogService, mockStripeClient)` in beforeEach; assert mock calls.

### Async and errors

- `await expect(promise).resolves.toBe(value)` or `.rejects.toThrow('message')`.
- Always `async/await` or return the promise.

### Mocking clients

- StripeClient: mock `stripeSDK` with jest.fn() on customers.create, paymentIntents.create, etc.; mockResolvedValue for return.
- RootClient: jest.mock the default export; mock SDK methods.

### Factories

Use `createMockStripeCustomer`, `createMockRootPolicy`, `createMockRootPayment`, etc. from `__tests__/helpers/factories.ts` for consistent test data.

## Best Practices

- **Behavior, not implementation**: Assert outcomes and service calls, not private methods.
- **Descriptive names**: "should create customer when email is provided", not "works".
- **AAA**: Arrange (data), Act (call), Assert (expect).
- **One concern per test**: Split create and update into separate tests.
- **Don't test SDKs**: Test your service/controller with mocked clients.
- **Isolate**: Each test independent; create fresh mocks/data in beforeEach.

## Coverage

- Aim: 70%+ overall, 80%+ services, 90%+ critical paths (payments, webhooks).
- `npm run test:coverage`; open `coverage/lcov-report/index.html` for report.

## Debugging

- Single file: `npm test -- log.service.test.ts`
- Pattern: `npm test -- --testNamePattern="should log"`
- Timeout: `jest.setTimeout(10000)` in test file if needed.
- Async: ensure `await` on async calls in tests.

## Common Issues

- **Timeout**: Increase jest.setTimeout or ensure promises are awaited.
- **Mock not applied**: Set up mocks in beforeEach; use jest.clearAllMocks() before each test.
