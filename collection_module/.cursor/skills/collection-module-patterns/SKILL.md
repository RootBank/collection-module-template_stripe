---
name: collection-module-patterns
description: Implements Stripe Collection Module patterns for services, controllers, clients, adapters, and error handling. Use when building features, adding services, writing controllers, using Stripe/Root clients, transforming data with adapters, or handling errors and retries.
---

# Collection Module Patterns

## Layer Flow

```
Controllers (orchestrate) → Services (business logic) → Clients & Adapters (infrastructure)
```

## Services

- Inject dependencies via constructor; use LogService for all logging.
- Available: LogService, ConfigurationService, RenderService, RootService, StripeService.
- Register new services in `core/container.setup.ts` (ServiceToken, SINGLETON); resolve via `getContainer().resolve(ServiceToken.X)`.
- Pattern: fetch (client) → transform (adapter if needed) → update (RootService); log start/success/error.

See [references/services.md](references/services.md) for usage and creating new services.

## Controllers

- One event type per controller; thin (<100 lines); validate input, call services, return early on validation failure.
- Register in container as TRANSIENT; wire in `webhook-hooks.ts` (resolve by ServiceToken, call `handle(payload)`).
- No business logic in controllers; no `new` for dependencies.

See [references/controllers.md](references/controllers.md) for examples and wiring.

## Clients

- **StripeClient**: `new StripeClient()`; use `stripeClient.stripeSDK.*` (customers, paymentIntents, setupIntents). Config from ConfigurationService.
- **RootClient**: Singleton `import rootClient from '../clients/root-client'`; use `rootClient.SDK.*`. Do not instantiate.
- Keep clients thin; error handling in services.

See [references/clients.md](references/clients.md) for mocking and new clients.

## Adapters

- **StripeToRootAdapter**: `convertInvoiceToRootPayment(invoice, { status, failureReason?, failureAction? })`, `convertCustomerToAppData(customer)`.
- Use for Stripe → Root data conversion only; no API calls, no business logic; keep pure and null-safe.

See [references/adapters.md](references/adapters.md) for when to use and creating adapters.

## Utils / Error Handling

- **ModuleError**: `new ModuleError('Message', { context })`.
- **Enhanced types**: ValidationError, NotFoundError, NetworkError, TimeoutError, RateLimitError, ServerError; use `isRetryableError()`, `formatErrorForLogging()`.
- **Retry**: `retryWithBackoff(fn, { maxRetries, shouldRetry })` for external APIs.
- **Timeout**: `withTimeout(promise, ms, message)` for long operations.
- Prefer LogService over legacy `logger.ts`.

See [references/utils.md](references/utils.md) for details.

## Quick Reference

| Layer      | Location           | Responsibility        |
|-----------|--------------------|------------------------|
| Controller| `code/controllers/`| Orchestrate, validate |
| Service   | `code/services/`   | Business logic        |
| Client    | `code/clients/`    | SDK/API access        |
| Adapter   | `code/adapters/`   | Data transformation   |
| Utils     | `code/utils/`      | Errors, retry, timeout|

## Additional Resources

- [references/services.md](references/services.md) — Service APIs, LogService/Config, creating services
- [references/controllers.md](references/controllers.md) — Controller structure, DI, webhook wiring
- [references/clients.md](references/clients.md) — StripeClient, RootClient, mocking
- [references/adapters.md](references/adapters.md) — StripeToRootAdapter, transformation rules
- [references/utils.md](references/utils.md) — Error types, retry, timeout
