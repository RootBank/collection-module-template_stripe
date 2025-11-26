# Log Viewing Guide

This guide explains how to view and use the collection module logs.

## Overview

The collection module implements **structured JSON logging** to stdout. All logs are automatically captured by your log aggregation system (CloudWatch Logs, DataDog, etc.) where they are:

- Persistent across Lambda invocations
- Searchable and filterable
- Available for long-term retention
- Accessible via your monitoring platform's UI and API

The collection module outputs structured JSON to stdout - your logging infrastructure handles collection, storage, and visualization.

## Accessing Logs

### Via CloudWatch Logs (AWS)

1. Navigate to AWS CloudWatch Logs
2. Find your Lambda function's log group
3. View log streams for recent invocations
4. Use CloudWatch Insights for advanced queries

### Via DataDog (or other platforms)

Configure your log aggregation platform to collect Lambda stdout logs. The structured JSON format makes it easy to parse and filter.

## Log Structure

Each log entry is a JSON object with the following fields:

| Field | Description |
|-------|-------------|
| `timestamp` | ISO 8601 timestamp |
| `level` | DEBUG, INFO, WARN, or ERROR |
| `environment` | production or development |
| `message` | The log message |
| `context` | Which part of the code logged this (optional) |
| `correlationId` | Request tracking ID (optional) |
| `metadata` | Additional structured data (optional) |
| `error` | Error details including stack trace (optional) |

### Log Levels

- 🔵 **DEBUG** - Detailed diagnostic information
- 🟢 **INFO** - General informational messages
- 🟡 **WARN** - Warning messages (potential issues)
- 🔴 **ERROR** - Error messages (something went wrong)

## Understanding Logs

### Common Contexts

| Context | What It Means |
|---------|---------------|
| `renderCreatePaymentMethod` | Creating payment method form |
| `afterPolicyPaymentMethodAssigned` | Processing payment method assignment |
| `afterPaymentCreated` | Processing payment creation |
| `WebhookHandler` | Processing Stripe webhook |
| `InvoicePaidController` | Processing invoice paid event |
| `PaymentCreationController` | Processing payment creation |
| `RootService` | Root API operations |

### Correlation IDs

Correlation IDs link related log entries together. For example, when a webhook is received, all logs for processing that webhook will share the same correlation ID.

**Use case**: Filter by correlation ID to see the complete flow of a single request.

### Metadata

Metadata provides additional context in structured format:

```
Message: "Payment method assigned to policy"
Context: "afterPolicyPaymentMethodAssigned"
Metadata: {
  "policyId": "policy_abc123",
  "stripeCustomerId": "cus_xyz789"
}
```

## Troubleshooting with Logs

### Example: Payment Failed

1. Open CloudWatch Logs or DataDog
2. Filter by level: ERROR
3. Look for recent error entries
4. Check error message and stack trace
5. Note the correlation ID
6. Filter by that correlation ID to see full request flow

### Example: Payment Method Issues

1. Filter by context: `afterPolicyPaymentMethodAssigned`
2. Look for your policy ID in metadata
3. Follow the log sequence to see where it stopped
4. Check for warnings or errors

### Example: Debugging Webhook Issues

1. Filter by context: `WebhookHandler`
2. Find the webhook event by timestamp
3. Get its correlation ID
4. Filter by correlation ID to see complete processing

## Log Retention

### CloudWatch Logs

- **Retention**: Configurable (default: 7-30 days based on log group settings)
- **Automatic Persistence**: All logs automatically sent to CloudWatch
- **Query Capabilities**: CloudWatch Insights for advanced querying
- **Access**: Available via CloudWatch console and API

### DataDog (Optional)

CloudWatch logs can optionally be forwarded to DataDog for:

- Advanced analytics and visualization
- Alerting and monitoring
- Performance tracking
- Cross-service correlation

## For Developers

### Adding Logs

Use the `LogService` throughout your code:

```typescript
import { getLogService } from '../services/log-instance';

const logService = getLogService();

// Log with context
logService.info('Processing started', 'MyContext');

// Log with metadata
logService.info('Payment created', 'PaymentProcessing', {
  paymentId: 'payment_123',
  amount: 10000,
});

// Log errors
try {
  await dangerousOperation();
} catch (error) {
  logService.error(
    'Operation failed',
    'MyContext',
    { operation: 'dangerousOperation' },
    error
  );
}
```

### Using Correlation IDs

For request flows:

```typescript
// Generate at start of request
const correlationId = logService.generateCorrelationId();

logService.info('Request started', 'WebhookHandler');

// ... process request ...

// All logs will include this correlation ID

// Clear at end
logService.clearCorrelationId();
```

### Best Practices

1. **Be Descriptive** - Write clear log messages
   ```typescript
   // Bad
   logService.info('Done');
   
   // Good
   logService.info('Payment method successfully attached to customer', 'RootService');
   ```

2. **Include Context** - Always provide context (service/controller name)
   ```typescript
   logService.info('Processing payment', 'PaymentCreationController');
   ```

3. **Add Metadata** - Include relevant IDs and data
   ```typescript
   logService.info('Creating payment intent', 'PaymentCreationController', {
     customerId: 'cus_123',
     policyId: 'pol_456',
   });
   ```

4. **Use Appropriate Levels**
   - DEBUG: Detailed diagnostic info (not shown to clients by default)
   - INFO: Normal operations
   - WARN: Something unusual but handled
   - ERROR: Something went wrong

5. **Don't Log Sensitive Data**
   ```typescript
   // Bad
   logService.info('Card details', 'PaymentService', {
     cardNumber: '4242424242424242', // Never do this!
   });
   
   // Good
   logService.info('Card details received', 'PaymentService', {
     cardLast4: '4242',
     cardBrand: 'visa',
   });
   ```

## Log Format

### JSON Format

Logs are output as structured JSON to stdout:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "environment": "production",
  "message": "Payment method assigned",
  "context": "afterPolicyPaymentMethodAssigned",
  "correlationId": "abc-123-def",
  "metadata": {
    "policyId": "policy_123",
    "stripeCustomerId": "cus_456"
  }
}
```

This format is automatically parsed by CloudWatch Logs, DataDog, and other log aggregation systems.

## FAQ

### Q: How long are logs kept?
**A**: In CloudWatch: Based on log group retention settings (typically 7-30 days). The retention period is configurable in CloudWatch.

### Q: Where can I view logs?
**A**: Logs are available in CloudWatch Logs (AWS Console) or your configured log aggregation platform (DataDog, etc.).

### Q: What if I need older logs?
**A**: All logs are retained in CloudWatch according to the retention policy. Access them via CloudWatch Logs console or the dashboard endpoint.

### Q: Can I filter by date range?
**A**: Yes, CloudWatch Insights supports powerful filtering by time range, log level, context, correlation ID, and more.

### Q: Why don't I see recent logs?
**A**: Logs should appear in CloudWatch within seconds. If logs are missing, check:
   1. CloudWatch log group exists for the Lambda function
   2. Lambda has IAM permissions to write to CloudWatch
   3. Logs are being output to stdout (check Lambda execution logs)

### Q: Does Lambda cold start affect logging?
**A**: No. Logs are sent to CloudWatch regardless of cold/warm starts. Every Lambda invocation outputs logs to stdout, which CloudWatch captures automatically.

### Q: Can I export logs?
**A**: The dashboard view is HTML. You can copy/paste or screenshot. For bulk export, contact support for DataDog access.

### Q: What does the correlation ID mean?
**A**: It's a unique ID for a single request flow. All logs from processing one webhook or event share the same correlation ID.

## Lambda-Specific Considerations

### CloudWatch Logs

The collection module automatically logs to CloudWatch:
1. **Log Group**: Auto-created by Lambda (e.g., `/aws/lambda/collection-module-function`)
2. **Log Streams**: One per Lambda execution
3. **Retention**: Configurable in CloudWatch (default: Never expire)
4. **IAM Permissions**: Lambda execution role automatically has CloudWatch Logs permissions

### Performance

- **Write Latency**: Negligible (~1-2ms to stdout)
- **CloudWatch Ingestion**: Near real-time (1-2 second delay)
- **Cost**: CloudWatch Logs pricing (~$0.50/GB ingested, $0.03/GB stored)

### Monitoring

Monitor these CloudWatch metrics:
- **Log Events**: Number of log entries
- **Ingestion**: Bytes ingested
- **Storage**: Total storage used

### Querying Logs

Use CloudWatch Logs Insights to query logs:

```
fields @timestamp, level, message, context, correlationId
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

## Support

For issues with log viewing:
1. Check if logs are appearing in CloudWatch Logs console
2. Verify Lambda has CloudWatch Logs permissions (usually automatic)
3. Check the log group name matches your Lambda function
4. Contact support with the policy ID and timestamp
5. Include any error messages shown

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [TESTING.md](./TESTING.md) - Testing guide including LogService tests

