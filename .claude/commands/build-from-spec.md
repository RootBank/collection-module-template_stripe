# /build-from-spec

Build a collection module from a provider spec or API doc.

The deterministic work is done by the scaffold CLI. This command extracts the params and calls it.

---

## Step 1 — Extract from the doc

Read the provided document and extract these values. Ask the user if any are missing.

| Param | CLI flag | Example |
|---|---|---|
| Provider name (PascalCase) | `--provider` | `GoCardless` |
| API type | `--api-type` | `sdk` or `http` |
| Base URL (if http) | `--base-url` | `https://api.gocardless.com` |
| SDK package (if sdk) | `--sdk-package` | `gocardless-nodejs` |
| Auth header | `--auth-header` | `Authorization` |
| Webhook signature header | `--webhook-header` | `Webhook-Signature` |
| Why this provider | `--reason` | `"GoCardless for ZA direct debit"` |

If the user hasn't filled in `docs/SPEC-TEMPLATE.md`, that's the fastest way to get all values.

---

## Step 2 — Run the scaffold CLI

Show the user the command, then run it:

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

The CLI creates 7 files deterministically and prints exactly what it did and why.

---

## Step 3 — Wire the remaining logic

After the scaffold runs, complete these (the CLI output will list them too):

- [ ] Register `PROVIDER_CLIENT` + `PROVIDER_SERVICE` in `code/core/container.setup.ts`
  → see `docs/02-ARCHITECTURE.md` for the registration pattern
- [ ] Add signature verify + event routing in `code/webhook-hooks.ts`
  → see `docs/09-WEBHOOKS.md`
- [ ] Wire lifecycle hooks in `code/lifecycle-hooks/`
  → see `docs/08-LIFECYCLE-HOOKS.md`
- [ ] Add config placeholders in `code/env.sample.ts`
  → see `docs/12-CONFIGURATION.md`
- [ ] Implement service method stubs in `code/services/{provider}.service.ts`
  → see `docs/04-SERVICES.md`
- [ ] Run `npm test` — all scaffolded tests should pass (stubs throw, tests check logging)
