# Setup Details (Reference)

## Quick Start

1. From repo root: `chmod +x setup-template.sh && ./setup-template.sh` (provider name, module key, env file, deps).
2. `cd collection_module`; edit `code/env.ts` with API keys.
3. `npm run validate`
4. `nvm use` then `npm test`

## Prerequisites

- Node.js 18+, npm 8+, Git
- Root Platform org access; payment provider account (e.g. Stripe); AWS for Lambda

## Manual Setup

1. Edit `collection_module/.root-config.json`: collectionModuleKey, collectionModuleName, organizationId, host, settings.legacyCodeExecution, manualTransactions.
2. `cp code/env.sample.ts code/env.ts`; fill Stripe and Root keys, URLs, ROOT_COLLECTION_MODULE_KEY.
3. `nvm use`; `npm install`; `npm run validate`; `npm test`; `npm run build`.

## Required Env Vars (code/env.ts)

NODE_ENV, STRIPE_SECRET_KEY_LIVE/TEST, STRIPE_PUBLISHABLE_KEY_LIVE/TEST, STRIPE_WEBHOOK_SIGNING_SECRET_LIVE/TEST, ROOT_API_KEY_LIVE/SANDBOX, ROOT_BASE_URL_LIVE/SANDBOX, ROOT_COLLECTION_MODULE_KEY. Optional: TIME_DELAY_IN_MILLISECONDS, STRIPE_PRODUCT_ID_LIVE/TEST.

## Troubleshooting

- "ENVIRONMENT is not set" → set NODE_ENV in code/env.ts.
- "Missing required configuration" → check code/env.ts for placeholders.
- "Module not found" → npm install.
- Tests failing → nvm use, npx jest --clearCache, or rm -rf node_modules && npm install.
- Validation warnings → update env and .root-config.json, run npm run lint:fix, nvm use.

## Common Commands

npm run validate | npm test | npm run lint | npm run lint:fix | npm run build | npm run test:coverage | npm run test:watch
