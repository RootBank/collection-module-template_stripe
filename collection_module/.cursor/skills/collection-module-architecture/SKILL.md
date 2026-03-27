---
name: collection-module-architecture
description: Explains the Collection Module codebase architecture, directory structure, layer model, and dependency injection. Use when understanding the project layout, navigating the codebase, or discussing architecture, DI container, domain models, or code organization.
---

# Collection Module Architecture

## Layer Structure

```
Entry Points (main.ts, webhook-hooks)
    ↓
Lifecycle Hooks & Controllers (orchestration)
    ↓
Services (business logic)
    ↓
Clients & Adapters (infrastructure)
    ↓
External APIs (Stripe, Root)
```

Each layer depends only on layers below. Hooks/controllers orchestrate; services hold business logic; clients/adapters handle APIs and data transformation.

## Directory Layout

| Path | Purpose |
|------|---------|
| `code/core/` | DI container (`container.ts`, `container.setup.ts`), domain models (`models/`) |
| `code/services/` | LogService, ConfigService, RenderService, RootService |
| `code/clients/` | StripeClient, RootClient (thin SDK wrappers) |
| `code/adapters/` | StripeToRootAdapter (Stripe ↔ Root data mapping) |
| `code/controllers/` | Webhook/lifecycle event processors |
| `code/lifecycle-hooks/` | Root Platform callback implementations |
| `code/utils/` | Error types, helpers |
| `__tests__/` | Tests mirroring `code/` structure |

Entry points: `main.ts`, `webhook-hooks.ts`, `lifecycle-hooks.ts`.

## Key Principles

- **Separation of concerns**: One responsibility per layer
- **Dependency injection**: All dependencies via constructor; resolve from container
- **Type safety**: TypeScript throughout; domain models in `core/models/`
- **Testability**: Unit tests with mocked deps; container replacement in tests

## DI Quick Reference

- Resolve: `getContainer().resolve<LogService>(ServiceToken.LOG_SERVICE)`
- Register in `code/core/container.setup.ts`; use `ServiceToken` (Symbols) and `ServiceLifetime.SINGLETON` or `TRANSIENT`
- Controllers: typically TRANSIENT; core services: SINGLETON

## Adding a New Feature

1. Create service in `code/services/` (if needed)
2. Create controller in `code/controllers/` (if event-driven)
3. Register in `code/core/container.setup.ts`
4. Wire in `webhook-hooks.ts` or `code/lifecycle-hooks/`
5. Add tests in `__tests__/`

## Additional Resources

- Full architecture details, data flows, extension points: [references/architecture.md](references/architecture.md)
- DI container API, registration, testing: [references/core-di.md](references/core-di.md)
