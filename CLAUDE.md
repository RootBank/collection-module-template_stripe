# Collection Module Template

## Project Overview
Root Platform collection module template for integrating payment providers (Stripe, PayFast, GoCardless, etc.).
TypeScript, Node 18+, Jest for testing, custom lightweight DI container.

Stripe is included as the reference implementation. The template is provider-agnostic.

## Architecture
```
Lifecycle Hooks / Controllers (orchestration)
    |
Services (business logic)
    |
Clients & Adapters (infrastructure)
    |
External APIs (Payment Provider, Root Platform)
```

Entry points: `code/main.ts`, `code/webhook-hooks.ts`, `code/lifecycle-hooks/`

## Key Commands
```bash
cd collection_module
npm test              # Run tests
npm run build         # Build
npm run lint          # Lint
npm run validate      # Validate config
npm run test:coverage # Coverage report
```

## Building from a Provider Spec

To build a collection module from a provider API doc or spec:

1. Share the doc with Claude (paste content, upload PDF, or describe the API)
2. Run `/build-from-spec` — Claude will extract required info and scaffold all files
3. If info is missing, Claude will ask before generating code

**What to include in your spec** — see `collection_module/docs/SPEC-TEMPLATE.md` for the full template. Key fields needed:
- Provider name and API type (SDK or REST)
- Base URL and auth method
- Webhook signature header and events to handle
- Operations needed (customer, payment, subscription)
- Config field values (API keys, secrets)

## Documentation Index
All implementation guidance lives in `collection_module/docs/`:

| Doc | Topic |
|-----|-------|
| `docs/SPEC-TEMPLATE.md` | **Template for provider specs (start here for new providers)** |
| `docs/00-OVERVIEW.md` | Architecture overview, directory map |
| `docs/01-GETTING-STARTED.md` | Setup and first run |
| `docs/02-ARCHITECTURE.md` | DI container, layers, data flow |
| `docs/03-PROVIDER-INTERFACE.md` | Implementing a new payment provider |
| `docs/04-SERVICES.md` | Service patterns (Log, Config, Root, Provider) |
| `docs/05-CONTROLLERS.md` | Controller and event handling patterns |
| `docs/06-CLIENTS.md` | API client patterns (SDK vs HTTP) |
| `docs/07-ADAPTERS.md` | Data transformation patterns |
| `docs/08-LIFECYCLE-HOOKS.md` | Root Platform lifecycle hooks |
| `docs/09-WEBHOOKS.md` | Webhook handling and security |
| `docs/10-TESTING.md` | Testing patterns and mocking |
| `docs/11-DEPLOYMENT.md` | Deployment and CI/CD |
| `docs/12-CONFIGURATION.md` | Environment and config |
| `docs/13-ERROR-HANDLING.md` | Error types, retry, timeout |
| `docs/14-BEST-PRACTICES.md` | Security, performance, monitoring |
| `docs/STRIPE-REFERENCE.md` | Stripe-specific implementation notes |

## Coding Conventions
- All services use constructor injection, registered in `code/core/container.setup.ts`
- Use `LogService` for all logging (never `console.log`)
- Controllers are thin orchestrators (<100 lines); business logic goes in services
- Tests mirror `code/` structure in `__tests__/`; use factories from `__tests__/helpers/factories.ts`
- Config field names are provider-agnostic: `providerSecretKey`, `providerPublishableKey`, etc.
- DI tokens are provider-agnostic: `ServiceToken.PROVIDER_CLIENT`, `ServiceToken.PROVIDER_SERVICE`
- Stripe code is the reference implementation; new providers follow the same patterns

## Custom Commands
- `/build-from-spec` - Upload or paste a provider spec/API doc and generate a complete implementation
