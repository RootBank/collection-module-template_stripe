# Best Practices (Reference)

## Architecture

Use DI for all dependencies; keep services stateless; separate clients (API), services (logic), controllers (routing), models (data).

## Error handling

Use structured errors (code, retryable, context). Implement retry with backoff for transient failures. Use timeouts for external calls.

## Performance

Minimize cold start (lazy load, ARM). Reuse clients across invocations (singleton/cached). Batch where possible; rate-limit concurrent calls.

## Security

Never log sensitive data. Validate all inputs (e.g. Joi). Always verify webhook signatures. Use env-specific keys; rotate keys (e.g. quarterly); store in Secrets Manager in prod.

## Testing

Coverage: critical paths 90%+, services 80%+, overall 70%+. Prefer unit tests; integration then E2E. Use test factories; meaningful assertions.

## Logging and monitoring

Structured logs with LogService; include context and metadata; use correlation IDs. Set CloudWatch alarms (error rate, latency, timeouts). Dashboards for volume, errors, latency, cold starts.

## Cost

Right-size memory; consider ARM; set realistic timeouts; set log retention (e.g. 30 days); avoid reserved concurrency unless needed.

## Maintenance

Semver and changelog; code review; update docs and runbooks; review logs and metrics; update deps and rotate keys regularly.

## Anti-patterns

No global state (Lambda doesn’t persist it). Don’t ignore errors. Don’t block event loop (use async crypto etc.). Validate/sanitize user input.
