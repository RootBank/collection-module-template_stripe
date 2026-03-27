# Log Viewing (Reference)

Structured JSON logs to stdout; captured by CloudWatch (or DataDog etc.).

## Log structure

Fields: timestamp (ISO 8601), level (DEBUG, INFO, WARN, ERROR), environment, message, context (component name), correlationId (optional), metadata (optional), error (optional, with stack).

## Access

CloudWatch: find Lambda log group, view streams, use CloudWatch Insights for queries. DataDog: if configured, ingest from Lambda/stdout.

## Contexts

Examples: renderCreatePaymentMethod, afterPolicyPaymentMethodAssigned, afterPaymentCreated, WebhookHandler, InvoicePaidController, RootService. Filter by context to trace a flow.

## Correlation IDs

One ID per request flow; all logs for that webhook/event share it. Filter by correlationId to see full request.

## Query (CloudWatch Insights)

Example: `fields @timestamp, level, message, context, correlationId | filter level = "ERROR" | sort @timestamp desc | limit 100`.

## Adding logs

Use LogService: logService.info('Message', 'Context', { metadata }); logService.error('Message', 'Context', metadata, error). Use generateCorrelationId() at request start, clearCorrelationId() at end. Don't log sensitive data (cards, keys, PII).
