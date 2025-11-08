# Best Practices for Collection Modules

This guide covers production best practices for building and maintaining collection modules.

## Table of Contents

- [Architecture](#architecture)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Security](#security)
- [Testing](#testing)
- [Logging & Monitoring](#logging--monitoring)
- [Cost Optimization](#cost-optimization)
- [Maintenance](#maintenance)

---

## Architecture

### Use Dependency Injection

✅ **Do:**
```typescript
class PaymentService {
  constructor(
    private readonly client: PaymentClient,
    private readonly logger: LogService
  ) {}
}
```

❌ **Don't:**
```typescript
class PaymentService {
  private client = new PaymentClient(); // Hard dependency
  private logger = console; // Global dependency
}
```

### Keep Services Stateless

✅ **Do:**
```typescript
class PaymentService {
  async processPayment(request: PaymentRequest) {
    // No instance state, idempotent operation
    return await this.client.create(request);
  }
}
```

❌ **Don't:**
```typescript
class PaymentService {
  private processedIds = new Set(); // State won't persist across Lambda invocations
}
```

### Separate Concerns

✅ **Do:**
- **Clients**: API communication only
- **Services**: Business logic only
- **Controllers**: Event routing only
- **Models**: Data structures only

❌ **Don't:**
- Mix API calls with business logic
- Put business logic in controllers
- Use models for data transformation

---

## Error Handling

### Use Structured Errors

✅ **Do:**
```typescript
class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

throw new PaymentError(
  'Payment failed',
  'PAYMENT_DECLINED',
  false, // Don't retry
  { orderId: '123', reason: 'insufficient_funds' }
);
```

❌ **Don't:**
```typescript
throw new Error('Payment failed'); // No context, unclear if retryable
```

### Implement Retry Logic

✅ **Do:**
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!error.retryable || attempt === maxRetries - 1) {
        throw error;
      }
      await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }
}
```

### Handle Timeouts

✅ **Do:**
```typescript
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    )
  ]);
}
```

---

## Performance

### Optimize Cold Starts

✅ **Do:**
- Minimize dependencies
- Lazy-load heavy modules
- Use ARM architecture (Graviton2)
- Increase memory allocation (faster CPU)

```typescript
// Lazy load heavy dependencies
let stripeSDK: any;
async function getStripeSDK() {
  if (!stripeSDK) {
    stripeSDK = await import('stripe');
  }
  return stripeSDK;
}
```

### Use Connection Pooling

✅ **Do:**
```typescript
// Reuse client across invocations
let cachedClient: StripeClient;

export function getStripeClient(): StripeClient {
  if (!cachedClient) {
    cachedClient = new StripeClient();
  }
  return cachedClient;
}
```

❌ **Don't:**
```typescript
// Creates new client every time
export function processPayment() {
  const client = new StripeClient(); // Slow!
  // ...
}
```

### Batch Operations

✅ **Do:**
```typescript
// Process multiple items in one call
const payments = await Promise.all(
  policyIds.map(id => rootClient.getPayment(id))
);
```

❌ **Don't:**
```typescript
// Sequential calls - slow!
for (const id of policyIds) {
  const payment = await rootClient.getPayment(id);
}
```

### Rate Limiting

✅ **Do:**
```typescript
class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = 0;
  
  constructor(private maxConcurrent: number = 10) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    while (this.processing >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.processing++;
    try {
      return await operation();
    } finally {
      this.processing--;
      this.queue.shift()?.();
    }
  }
}
```

---

## Security

### Never Log Sensitive Data

✅ **Do:**
```typescript
logger.info('Payment processed', 'PaymentService', {
  paymentId: payment.id,
  amount: payment.amount,
  // Don't log: card numbers, API keys, PII
});
```

❌ **Don't:**
```typescript
logger.info('Payment processed', payment); // May contain sensitive data!
```

### Validate All Inputs

✅ **Do:**
```typescript
import Joi from 'joi';

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  policyId: Joi.string().uuid().required()
});

export async function createPayment(data: unknown) {
  const validated = await paymentSchema.validateAsync(data);
  // Now safely use validated data
}
```

### Verify Webhook Signatures

✅ **Do:**
```typescript
export async function handleWebhook(event: any) {
  // ALWAYS verify signature first
  const isValid = stripe.webhooks.constructEvent(
    event.body,
    event.headers['stripe-signature'],
    webhookSecret
  );
  
  if (!isValid) {
    return { statusCode: 400, body: 'Invalid signature' };
  }
  
  // Process webhook
}
```

❌ **Don't:**
```typescript
export async function handleWebhook(event: any) {
  // Process webhook WITHOUT verification - dangerous!
  await processPayment(event.data);
}
```

### Use Environment-Specific Keys

✅ **Do:**
```typescript
const config = {
  development: {
    stripeKey: 'sk_test_xxxxx', // Test key
    rootApiKey: 'sandbox_xxxxx'  // Sandbox key
  },
  production: {
    stripeKey: process.env.STRIPE_KEY_LIVE, // From Secrets Manager
    rootApiKey: process.env.ROOT_KEY_LIVE
  }
};
```

### Implement API Key Rotation

✅ **Do:**
- Store keys in AWS Secrets Manager
- Support multiple valid keys during rotation
- Audit key usage in CloudWatch
- Rotate keys every 90 days

---

## Testing

### Test Coverage Goals

- **Critical paths**: 90%+ coverage
- **Services**: 80%+ coverage
- **Overall**: 70%+ coverage

### Test Pyramid

```
      E2E Tests (10%)
    Integration Tests (30%)
  Unit Tests (60%)
```

### Write Meaningful Tests

✅ **Do:**
```typescript
it('should create payment and update Root when invoice is paid', async () => {
  // Arrange
  const invoice = createMockInvoice({ amount: 1000 });
  mockStripeClient.getInvoice.mockResolvedValue(invoice);
  mockRootClient.createPayment.mockResolvedValue({ id: 'pay_123' });
  
  // Act
  await processInvoicePaid({ invoiceId: invoice.id });
  
  // Assert
  expect(mockRootClient.createPayment).toHaveBeenCalledWith({
    policyId: invoice.metadata.policyId,
    amount: 10.00,
    status: 'succeeded'
  });
});
```

❌ **Don't:**
```typescript
it('works', async () => {
  const result = await service.doSomething();
  expect(result).toBeDefined(); // Too vague
});
```

### Use Test Factories

✅ **Do:**
```typescript
// __tests__/helpers/factories.ts
export function createMockPayment(overrides?: Partial<Payment>): Payment {
  return {
    id: 'pay_123',
    amount: 100,
    status: 'succeeded',
    ...overrides
  };
}

// In tests
const payment = createMockPayment({ amount: 500 });
```

---

## Logging & Monitoring

### Use Structured Logging

✅ **Do:**
```typescript
logger.info('Payment processed', 'PaymentService', {
  paymentId: 'pay_123',
  amount: 100,
  currency: 'USD',
  policyId: 'pol_456',
  duration: 234 // ms
});
```

❌ **Don't:**
```typescript
console.log('Payment pay_123 processed for $100 USD'); // Unstructured
```

### Log Appropriate Levels

- **ERROR**: Something failed, needs attention
- **WARN**: Something unexpected, but handled
- **INFO**: Important business events
- **DEBUG**: Detailed information (dev only)

✅ **Do:**
```typescript
logger.info('Payment created', 'PaymentService', { paymentId });
logger.warn('Retrying failed API call', 'StripeClient', { attempt: 2 });
logger.error('Payment failed', 'PaymentService', { error, paymentId });
```

### Include Correlation IDs

✅ **Do:**
```typescript
const correlationId = event.requestContext?.requestId || generateId();

logger.info('Processing request', 'Handler', { correlationId });
// Pass correlationId through all operations
```

### Set Up Alarms

Create CloudWatch Alarms for:
- **Error rate** > 5% over 5 minutes
- **Timeout rate** > 1% over 5 minutes
- **API latency** > 3 seconds (p95)
- **Memory usage** > 80%

### Create Dashboards

Monitor:
- Request volume
- Error rates by type
- Latency percentiles (p50, p95, p99)
- Cold start frequency
- Memory utilization
- Cost per invocation

---

## Cost Optimization

### Right-Size Memory

✅ **Do:**
- Start with 512 MB
- Monitor actual usage in CloudWatch
- Adjust based on metrics
- Test different configurations

### Use ARM Architecture

✅ **Do:**
- Use ARM64 (Graviton2) for 20% cost savings
- Same or better performance
- Ensure dependencies support ARM

### Optimize Timeouts

✅ **Do:**
- Set realistic timeouts
- Don't over-provision (default 3s often sufficient)
- Monitor actual duration
- Fail fast on errors

### Manage Log Retention

✅ **Do:**
```bash
# Set appropriate retention
aws logs put-retention-policy \
  --log-group-name /aws/lambda/your-function \
  --retention-in-days 30  # or 7 for dev
```

### Use Reserved Concurrency Wisely

❌ **Don't:**
- Reserve concurrency unless you have a specific need
- It costs money even when not used

✅ **Do:**
- Use on-demand scaling
- Set account-level concurrency limits if needed

---

## Maintenance

### Version Control

✅ **Do:**
- Use semantic versioning
- Tag releases
- Maintain changelog
- Document breaking changes

### Code Reviews

✅ **Do:**
- Review all code changes
- Check test coverage
- Verify error handling
- Review security implications

### Documentation

✅ **Do:**
- Keep README up to date
- Document configuration changes
- Maintain runbooks
- Document incident responses

### Monitoring

✅ **Do:**
- Review logs weekly
- Check dashboards daily
- Investigate anomalies
- Track key metrics

### Regular Updates

✅ **Do:**
- Update dependencies monthly
- Review security advisories
- Test after updates
- Rotate API keys quarterly

---

## Anti-Patterns

### Don't Use Global State

❌ **Don't:**
```typescript
let processedEvents = []; // Won't work across Lambda invocations

export async function processEvent(event: any) {
  if (processedEvents.includes(event.id)) return;
  processedEvents.push(event.id);
}
```

### Don't Ignore Errors

❌ **Don't:**
```typescript
try {
  await updatePayment();
} catch (error) {
  // Silent failure - dangerous!
}
```

### Don't Block Event Loop

❌ **Don't:**
```typescript
// Synchronous crypto operations block event loop
const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
```

✅ **Do:**
```typescript
// Use async version
const hash = await crypto.pbkdf2(password, salt, 10000, 64, 'sha512');
```

### Don't Trust User Input

❌ **Don't:**
```typescript
const sql = `SELECT * FROM payments WHERE id = ${req.body.id}`;
```

✅ **Do:**
```typescript
// Validate and sanitize
const paymentId = paymentIdSchema.validateSync(req.body.id);
const payment = await db.getPayment(paymentId);
```

---

## Quick Reference Checklist

### Before Deployment
- [ ] All tests passing (>70% coverage)
- [ ] No sensitive data in logs
- [ ] Error handling implemented
- [ ] Webhook signature verification
- [ ] Configuration validated
- [ ] Dependencies updated
- [ ] Security review completed
- [ ] Documentation updated

### Production Monitoring
- [ ] CloudWatch Alarms configured
- [ ] Dashboard created
- [ ] Log retention set
- [ ] Metrics tracked
- [ ] On-call rotation defined
- [ ] Runbook documented

### Regular Maintenance
- [ ] Review logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate keys quarterly
- [ ] Review metrics monthly
- [ ] Update documentation as needed

---

## Resources

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Logging Best Practices](https://aws.amazon.com/blogs/mt/best-practices-cloudwatch-logs/)

