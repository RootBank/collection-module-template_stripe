# Collection Module Template

> AI entry point. Use the table below to find what you need in ≤2 jumps. Don't load docs you don't need.

## Table of Contents

| Task | Go to |
|---|---|
| **Build a new provider from a spec/doc** | [`/build-from-spec`](.claude/commands/build-from-spec.md) |
| **Scaffold files via CLI** | `npm run scaffold:provider -- --help` |
| Architecture overview + directory map | `docs/00-OVERVIEW.md` |
| Setup and first run | `docs/01-GETTING-STARTED.md` |
| DI container, layers, data flow | `docs/02-ARCHITECTURE.md` |
| Adding a new payment provider (manual) | `docs/03-PROVIDER-INTERFACE.md` |
| Service patterns | `docs/04-SERVICES.md` |
| Controller patterns | `docs/05-CONTROLLERS.md` |
| Client patterns (SDK vs HTTP) | `docs/06-CLIENTS.md` |
| Adapter patterns | `docs/07-ADAPTERS.md` |
| Lifecycle hooks | `docs/08-LIFECYCLE-HOOKS.md` |
| Webhooks and security | `docs/09-WEBHOOKS.md` |
| Testing patterns | `docs/10-TESTING.md` |
| Deployment and CI/CD | `docs/11-DEPLOYMENT.md` |
| Config and environment | `docs/12-CONFIGURATION.md` |
| Error handling, retry, timeout | `docs/13-ERROR-HANDLING.md` |
| Stripe reference implementation | `docs/STRIPE-REFERENCE.md` |
| Provider spec template | `docs/SPEC-TEMPLATE.md` |

## Key Commands

```bash
cd collection_module
npm run scaffold:provider -- --provider=MyProvider --api-type=http --base-url=https://... --reason="why"
npm test
npm run build
npm run lint
npm run scaffold:provider -- --help   # full options
```

## Conventions

- **DI**: constructor injection; register in `code/core/container.setup.ts`
- **Logging**: `LogService` only — no `console.log`
- **Errors**: `ModuleError`; external calls: `retryWithBackoff`
- **Controllers**: thin orchestrators, <100 lines
- **Config fields**: provider-agnostic — `providerSecretKey`, `providerWebhookSigningSecret`
- **DI tokens**: provider-agnostic — `PROVIDER_CLIENT`, `PROVIDER_SERVICE`
- **Tests**: mirror `code/` in `__tests__/`; factories in `__tests__/helpers/factories.ts`
- **Reference**: Stripe is the working example — read it before writing a new provider
