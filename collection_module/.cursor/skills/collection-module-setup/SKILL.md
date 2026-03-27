---
name: collection-module-setup
description: Guides setup and configuration of the Stripe Collection Module template. Use when setting up the project, configuring environment variables, API keys, Root Platform config, running the setup script, or troubleshooting installation and validation.
---

# Collection Module Setup

## Quick Start

1. From repository root: `./setup-template.sh` (after `chmod +x setup-template.sh`). Script configures provider name, collection module key, env file, and installs dependencies.
2. Edit `collection_module/code/env.ts` with real API keys (do not commit; use env.sample.ts as template).
3. Run `npm run validate` inside `collection_module`.
4. Run `nvm use` then `npm test`.

## Prerequisites

- Node.js 18+ (use `.nvmrc` / `nvm use`), npm 8+, Git
- Root Platform organization access; payment provider account (e.g. Stripe); AWS for Lambda when deploying

## Configuration Files

| File | Purpose | Commit? |
|------|---------|--------|
| `code/env.ts` | Stripe & Root API keys, URLs, NODE_ENV | No (copy from env.sample.ts) |
| `.root-config.json` | Module key, name, organizationId, host, settings | Yes |
| `.root-auth` | ROOT_API_KEY only | No (gitignored) |

Root: collection module key format `cm_{provider}_{company}`; use sandbox keys for development.

## Validation and Build

- `npm run validate` — checks config files, no placeholders, TypeScript, tests, Node version.
- `npm test` / `npm run test:coverage` / `npm run test:watch`
- `npm run build` — compiles to `dist/`
- `npm run lint` / `npm run lint:fix`

## Next Steps After Setup

Implement provider logic (see customization/integration skills), configure webhooks, then deploy (see ops skill).

## Additional Resources

- Full setup steps, env var table, troubleshooting: [references/setup-details.md](references/setup-details.md)
- .root-config.json and .root-auth fields, validation, troubleshooting: [references/root-configuration.md](references/root-configuration.md)
