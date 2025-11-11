# Controllers

This directory contains event processors that handle webhooks and lifecycle hooks from Stripe and the Root Platform.

## Architecture

Controllers follow a **clean architecture pattern**:

```
Webhooks/Lifecycle Hooks → Controllers → Services → Clients
     (entry)              (orchestrate)  (business)  (infrastructure)
```

### Key Principles

1. **Dependency Injection**: All dependencies injected via constructor
2. **Single Responsibility**: Each controller handles one event type
3. **Thin Orchestration**: Controllers coordinate services, don't contain business logic
4. **Testability**: Easy to mock dependencies for unit testing

## Example Controllers

### Stripe Event Processor

```typescript
export class InvoicePaidController {
  constructor(
    private readonly logService: LogService,
    private readonly rootService: RootService,
    private readonly stripeClient: StripeClient,
  ) {}

  async handle(invoice: Stripe.Invoice): Promise<void> {
    // 1. Validate input
    // 2. Coordinate services
    // 3. Handle errors
  }
}
```

### Root Event Processor

```typescript
export class PaymentCreationController {
  constructor(
    private readonly logService: LogService,
    private readonly rootService: RootService,
    private readonly stripeClient: StripeClient,
  ) {}

  async handle(params: PaymentCreationParams): Promise<void> {
    // 1. Validate input
    // 2. Coordinate services
    // 3. Handle errors
  }
}
```

## Directory Structure

```
controllers/
├── stripe-event-processors/
│   ├── invoice-paid.controller.ts          # Example Stripe webhook handler
│   ├── invoice-payment-failed.controller.ts
│   ├── charge-disputed.controller.ts
│   └── ...
├── root-event-processors/
│   ├── payment-creation.controller.ts      # Example Root lifecycle handler
│   ├── policy-alteration.controller.ts
│   └── ...
└── README.md (this file)
```

## Creating a New Controller

### 1. Create Controller File

```typescript
// controllers/stripe-event-processors/my-event.controller.ts
import { LogService } from '../../services/log.service';
import { RootService } from '../../services/root.service';

export class MyEventController {
  constructor(
    private readonly logService: LogService,
    private readonly rootService: RootService,
    // Add other dependencies as needed
  ) {}

  async handle(payload: StripeEventPayload): Promise<void> {
    this.logService.info('Processing my event', 'MyEventController', {
      id: payload.id,
    });

    // Your orchestration logic here
  }
}
```

### 2. Register in DI Container

```typescript
// core/container.setup.ts
container.register(
  ServiceToken.MY_EVENT_CONTROLLER,
  (c) => {
    const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
    const rootService = c.resolve(ServiceToken.ROOT_SERVICE);
    
    const { MyEventController } = require(
      '../controllers/stripe-event-processors/my-event.controller'
    );
    return new MyEventController(logService, rootService);
  },
  ServiceLifetime.TRANSIENT,
);
```

### 3. Wire in Webhook Handler

```typescript
// webhook-hooks.ts
switch (parsedBody.type) {
  case 'my.event.type': {
    const controller = container.resolve<MyEventController>(
      ServiceToken.MY_EVENT_CONTROLLER
    );
    await controller.handle(payload);
    break;
  }
}
```

## Testing Controllers

Controllers are easy to test with dependency injection:

```typescript
describe('InvoicePaidController', () => {
  let controller: InvoicePaidController;
  let mockLogService: jest.Mocked<LogService>;
  let mockRootService: jest.Mocked<RootService>;
  let mockStripeClient: jest.Mocked<StripeClient>;

  beforeEach(() => {
    mockLogService = createMockLogService();
    mockRootService = {
      updatePaymentStatus: jest.fn(),
    } as any;
    mockStripeClient = createMockStripeClient();

    controller = new InvoicePaidController(
      mockLogService,
      mockRootService,
      mockStripeClient,
    );
  });

  it('should update Root payments when invoice is paid', async () => {
    const invoice = createMockInvoice();
    
    await controller.handle(invoice);
    
    expect(mockRootService.updatePaymentStatus).toHaveBeenCalledWith({
      paymentId: 'payment_123',
      status: PaymentStatus.Successful,
    });
  });
});
```

## Best Practices

### Do ✅

- Keep controllers thin (< 100 lines)
- Inject all dependencies via constructor
- Use services for business logic
- Log important steps
- Handle errors gracefully
- Return early for validation failures
- Use TypeScript types

### Don't ❌

- Put business logic in controllers
- Create dependencies with `new` inside controller
- Make direct SDK calls (use clients)
- Ignore errors
- Mix multiple responsibilities
- Use global singletons
- Skip input validation

## Related Documentation

- [Architecture Improvements](../../../ARCHITECTURE_IMPROVEMENTS.md)
- [Service Layer](../../services/README.md)
- [DI Container](../../core/container.ts)
- [Testing Guide](../../../docs/TESTING.md)

