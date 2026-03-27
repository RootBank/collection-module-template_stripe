# Services (Reference)

Controllers → Services → Clients. Services encapsulate business logic, coordinate operations, transform data, implement business rules.

## Available Services

- **LogService**: Structured JSON logging; levels DEBUG/INFO/WARN/ERROR; correlation IDs. Use `getLogService()` from `log-instance`.
- **ConfigurationService**: Type-safe config; env-specific; validation on startup. Use `getConfigService()` from `config-instance`.
- **RenderService**: HTML for dashboard (payment method forms/summary/detail); XSS protection.
- **RootService**: Root Platform operations (policy, payments); type-safe wrappers.
- **StripeService**: Stripe operations (customer, payment intent, payment method, subscription); type-safe wrappers.

## LogService Usage

```typescript
logService.info('Operation completed', 'MyService');
logService.error('Operation failed', 'MyService', {}, error);
logService.info('Payment created', 'PaymentService', { paymentId, amount });
const correlationId = logService.generateCorrelationId();
// ... logs include correlation ID
logService.clearCorrelationId();
```

## Creating a New Service

1. Create file in `code/services/`; inject LogService, clients, other services via constructor.
2. Register in `core/container.setup.ts` with `ServiceToken` and `ServiceLifetime.SINGLETON`.
3. Use in controllers: `getContainer().resolve(ServiceToken.MY_SERVICE)`.

## Patterns

- **Orchestration**: Coordinate Stripe + Root (create customer → attach PM → create subscription → update Root).
- **Transformation**: Map Stripe status to Root status; call adapter then RootService.

Do: Inject deps, use LogService, handle errors with context, single responsibility, unit test with mocks. Don't: `new` dependencies in service, mix infra with business logic, skip logging on catch.
