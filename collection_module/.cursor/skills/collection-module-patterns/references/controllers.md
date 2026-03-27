# Controllers (Reference)

Webhooks/Lifecycle → Controllers → Services → Clients. Controllers orchestrate; they do not contain business logic.

## Principles

- Dependency injection via constructor
- One controller per event type
- Thin: validate input, call services, handle errors
- Testable with mocked services

## Structure

- `controllers/stripe-event-processors/` — e.g. invoice-paid.controller.ts, invoice-payment-failed.controller.ts
- `controllers/root-event-processors/` — e.g. payment-creation.controller.ts

## Creating a Controller

1. Create class with constructor(logService, rootService, stripeClient, ...). Implement `handle(payload)`.
2. Register in `container.setup.ts` with `ServiceLifetime.TRANSIENT`.
3. Wire in `webhook-hooks.ts`: resolve controller by `ServiceToken`, call `controller.handle(payload)`.

## Example

```typescript
export class InvoicePaidController {
  constructor(
    private readonly logService: LogService,
    private readonly rootService: RootService,
    private readonly stripeClient: StripeClient,
  ) {}

  async handle(invoice: Stripe.Invoice): Promise<void> {
    this.logService.info('Processing invoice.paid', 'InvoicePaidController', { invoiceId: invoice.id });
    if (!invoice.metadata?.rootPaymentId) return;
    await this.rootService.updatePaymentStatus({ paymentId: invoice.metadata.rootPaymentId, status: PaymentStatus.Successful });
  }
}
```

## Testing

Inject mocks in constructor; assert service methods called with expected args. No business logic in controller, so tests focus on orchestration.

Do: Thin (<100 lines), inject deps, use services, log steps, return early on validation. Don't: Business logic in controller, `new` deps, direct SDK calls, skip validation.
