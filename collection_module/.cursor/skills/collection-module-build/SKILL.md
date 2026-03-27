---
name: collection-module-build
description: Build a complete collection module from a provider spec or API doc. Use when the user uploads a spec, pastes API docs, or asks to implement a new payment provider from scratch.
---

# Build from Provider Spec

The deterministic work is done by the scaffold CLI. This skill extracts params and calls it.

## Table of Contents
- [Step 1 — Extract params](#step-1--extract-params)
- [Step 2 — Run the CLI](#step-2--run-the-cli)
- [Step 3 — Wire remaining logic](#step-3--wire-remaining-logic)

---

## Step 1 — Extract params

From the spec/doc, find these values. Ask if any are missing.

| Param | CLI flag | Source in doc |
|---|---|---|
| Provider name (PascalCase) | `--provider` | Title / intro |
| API type | `--api-type` | Authentication section |
| Base URL | `--base-url` | API reference |
| SDK package | `--sdk-package` | If SDK exists on npm |
| Auth header | `--auth-header` | Authentication section |
| Webhook sig header | `--webhook-header` | Webhooks section |
| Why this provider | `--reason` | Ask the user |

If the user hasn't filled out a spec, point them to `docs/SPEC-TEMPLATE.md`.

---

## Step 2 — Run the CLI

```bash
cd collection_module
npm run scaffold:provider -- \
  --provider=<Name> \
  --api-type=<sdk|http> \
  --base-url=<url> \
  --auth-header=<header> \
  --webhook-header=<header> \
  --reason="<why>"
```

`--dry-run` to preview without writing. `--help` for full options.

The CLI creates 7 files and prints exactly what it did and why.

---

## Step 3 — Wire remaining logic

After the scaffold, complete these:

- [ ] `code/core/container.setup.ts` — register `PROVIDER_CLIENT` + `PROVIDER_SERVICE`
  → [DI patterns](../collection-module-architecture/references/core-di.md)
- [ ] `code/webhook-hooks.ts` — verify signature + route events
  → [Webhook patterns](../collection-module-integration/references/webhooks.md)
- [ ] `code/lifecycle-hooks/` — policy, payment, payment-method hooks
  → [Lifecycle hook patterns](../collection-module-integration/references/lifecycle-hooks.md)
- [ ] `code/env.sample.ts` — add config placeholders
- [ ] `code/services/{provider}.service.ts` — implement method stubs
  → [Service patterns](../collection-module-patterns/references/services.md)
- [ ] Run `npm test`
