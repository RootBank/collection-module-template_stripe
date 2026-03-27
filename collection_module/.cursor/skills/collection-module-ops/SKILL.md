---
name: collection-module-ops
description: Deployment, CI/CD, logging, and production practices for the Stripe Collection Module. Use when deploying to Root Platform, configuring CI/CD, viewing or querying logs, or applying production best practices for security, performance, and maintenance.
---

# Collection Module Operations

## Deployment

Collection modules are deployed via the **Root Platform API**; Root handles infrastructure. You do not deploy Lambda directly.

1. **Prepare**: `npm run validate`, `npm test`, `npm run lint`, `npm run build`; ensure no secrets committed.
2. **Tag**: `git tag -a v1.0.0 -m "Release"`; push tag. Use semver.
3. **Publish**: `POST {{host}}/v1/apps/{{org_id}}/insurance/collection-modules/{{cm_key}}/publish?bumpSandbox=true` with Basic Auth (API key). Use `bumpSandbox=true` for sandbox, `false` for production.
4. **Verify**: Root dashboard, test policy/webhooks, check logs.

Secrets and env vars are set in Root Platform dashboard (Collection Modules → Settings). Rollback by publishing a previous version (same API with earlier tag/code).

See [references/deployment.md](references/deployment.md) for full steps and troubleshooting.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) run on PRs and pushes: **Lint** (ESLint), **Test** (Jest, coverage ≥70%), **Build** (TypeScript). All must pass to merge. Coverage comment posted on PRs.

Local pre-push: `npm run lint`, `npm run lint:fix`, `npm test`, `npm run test:coverage`, `npm run build`. CI creates `code/env.ts` from `env.sample.ts`.

See [references/ci-cd.md](references/ci-cd.md) for debugging failed CI.

## Logging

Logs are **structured JSON** to stdout (CloudWatch/DataDog). Fields: timestamp, level (DEBUG/INFO/WARN/ERROR), message, context (component), correlationId, metadata, error.

Use **LogService**: `logService.info('Message', 'Context', { metadata })`; `logService.error(..., error)`. Use `generateCorrelationId()` / `clearCorrelationId()` for request tracing. Do not log sensitive data.

Query in CloudWatch Insights by level, context, correlationId, time range. See [references/log-viewing.md](references/log-viewing.md) for access and query examples.

## Best Practices

- **Architecture**: DI, stateless services, separate layers.
- **Errors**: Structured errors, retry with backoff, timeouts.
- **Security**: Validate input, verify webhook signatures, env-specific keys, no secrets in logs.
- **Performance**: Reuse clients, lazy load, consider ARM; batch and rate-limit where appropriate.
- **Monitoring**: Alarms (error rate, latency), dashboards, log retention.
- **Maintenance**: Semver, changelog, review logs/metrics, update deps, rotate keys.

See [references/best-practices.md](references/best-practices.md) for full checklist and anti-patterns.

## Additional Resources

- [references/deployment.md](references/deployment.md) — Publish API, versioning, rollback
- [references/ci-cd.md](references/ci-cd.md) — GitHub Actions, coverage, debugging
- [references/log-viewing.md](references/log-viewing.md) — Log structure, CloudWatch, correlation IDs
- [references/best-practices.md](references/best-practices.md) — Production checklist
