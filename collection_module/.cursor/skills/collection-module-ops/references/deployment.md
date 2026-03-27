# Deployment (Reference)

Root Platform hosts the module; you publish via API. No direct AWS Lambda deploy—Root handles infra.

## Prerequisites

Completed module, Root API key, organization ID, collection module key, host URL (e.g. https://api.rootplatform.com).

## Process

1. **Prepare**: `npm run validate`, `npm test`, `npm run lint`, `npm run build`; ensure env.ts not committed.
2. **Version**: Tag release (e.g. `git tag -a v1.0.0 -m "Release 1.0.0"`, `git push origin v1.0.0`). Use semver.
3. **Publish**: POST to Root Platform API:
   ```
   POST {{host}}/v1/apps/{{org_id}}/insurance/collection-modules/{{cm_key}}/publish?bumpSandbox=true
   Authorization: Basic {{api_key}}
   ```
   Use `bumpSandbox=true` for sandbox, `false` for production.
4. **Verify**: Check Root dashboard (Collection Modules), test policy/webhooks, monitor logs.

## Env-specific

- Sandbox: use sandbox API key and bumpSandbox=true.
- Production: use production key and bumpSandbox=false. Deploy to sandbox first; test; then production.

## Config

Secrets and env vars configured in Root Platform dashboard (Collection Modules → Settings), not in repo.

## Rollback

Publish a previous version by checking out that tag and calling the publish API again with the same org/cm_key.

## Troubleshooting

Deployment failed: check API response, key permissions, org ID and cm_key. Module not executing: verify published/active, webhook URL, provider config, logs.
