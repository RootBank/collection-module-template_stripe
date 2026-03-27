# Root Platform Configuration (Reference)

## .root-config.json

Location: `collection_module/.root-config.json`. Committed to git (no secrets).

Fields: collectionModuleKey (required, `cm_` prefix, e.g. cm_stripe_acme), collectionModuleName, organizationId (UUID), host (Root API URL), settings.legacyCodeExecution (false), manualTransactions (array, often []).

Naming: Key = lowercase + underscores, `cm_{provider}_{company}`. Name = Title Case, descriptive.

## .root-auth

Location: `collection_module/.root-auth`. Gitignored; never commit.

Content: `ROOT_API_KEY=sandbox_sk_...` or `production_sk_...`. Get from Root Platform → Settings → API Keys.

Use sandbox for dev; production for prod; store in secrets manager in CI.

## Validation

- `cat .root-config.json | jq '.'` to check JSON.
- Ensure .root-auth exists and contains ROOT_API_KEY=.

## Troubleshooting

- Invalid collectionModuleKey: must start with cm_, lowercase/numbers/underscores only.
- Unauthorized: check key format, env (sandbox vs production), revoke/regenerate if needed.
- Organization not found: fix organizationId in .root-config.json (from Root dashboard).
- .root-auth missing: cp .root-auth.sample .root-auth and edit.
- "Cannot read property 'host'" → validate .root-config.json with jq or restore from sample.

## Env Vars (deployment)

Scripts can use ROOT_API_KEY, ROOT_ORG_ID, ROOT_HOST, CM_KEY from environment instead of files.
