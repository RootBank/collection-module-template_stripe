# Webhook Setup Guide

This guide covers setting up and handling webhooks from your payment provider.

## Overview

Webhooks allow payment providers to notify your collection module about events like:
- Payment succeeded/failed
- Subscription updated/cancelled
- Refund processed
- Dispute created
- Invoice finalized

Your collection module receives these webhooks, processes them, and updates Root Platform accordingly.

---

## Architecture

```
Payment Provider (Stripe)
    ↓  HTTP POST
Your Lambda Function (API Gateway endpoint)
    ↓  Verify signature
Webhook Handler
    ↓  Route by event type
Event-Specific Controller
    ↓  Process and update
Root Platform API
```

---

## Setting Up Webhooks

### Step 1: Deploy Your Lambda Function

First, deploy your collection module to AWS Lambda (see [DEPLOYMENT.md](./DEPLOYMENT.md)).

You'll need the API Gateway endpoint URL:
```
https://xxxxx.execute-api.region.amazonaws.com/default/webhook
```

### Step 2: Register Webhook with Provider

#### Stripe Example

1. **Go to Stripe Dashboard**
   - Navigate to [Developers → Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"

2. **Configure Endpoint**
   - Endpoint URL: Your API Gateway URL
   - Description: "Collection Module Webhooks"
   - API Version: Latest

3. **Select Events**

Select the events you need to handle:

**Payment Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`

**Invoice Events:**
- `invoice.created`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.voided`
- `invoice.marked_uncollectible`

**Subscription Events:**
- `subscription_schedule.updated`
- `customer.subscription.updated`
- `customer.subscription.deleted`

4. **Get Signing Secret**
   - After creating the endpoint, copy the "Signing secret"
   - Format: `whsec_xxxxxxxxxxxxx`
   - Save this securely

5. **Update Your Configuration**

Add the signing secret to your Lambda environment variables:

```bash
STRIPE_WEBHOOK_SIGNING_SECRET_LIVE=whsec_xxxxx
```

Or in `code/env.ts` for local testing:
```typescript
export const STRIPE_WEBHOOK_SIGNING_SECRET_LIVE = 'whsec_xxxxx';
```

### Step 3: Test Webhook Delivery

1. **Send Test Event from Provider Dashboard**
   - In Stripe Dashboard → Webhooks → Your endpoint
   - Click "Send test webhook"
   - Select an event type
   - Click "Send test event"

2. **Check Logs**

```bash
# AWS CloudWatch
aws logs tail /aws/lambda/your-function-name --follow

# Or in AWS Console
CloudWatch → Log Groups → /aws/lambda/your-function-name
```

3. **Verify Response**
   - HTTP 200 = Success
   - HTTP 400/500 = Error (check logs)

---

## Webhook Security

### Signature Verification

**Critical:** Always verify webhook signatures to prevent spoofing.

#### How It Works

1. Provider sends webhook with signature header
2. Your code computes expected signature
3. Compare signatures - if they match, webhook is authentic

#### Implementation

```typescript
// In webhook-hooks.ts

import Stripe from 'stripe';

export async function processWebhook(event: any) {
  const signature = event.headers['stripe-signature'];
  const payload = event.body;
  
  // Verify signature
  try {
    const webhookEvent = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SIGNING_SECRET_LIVE
    );
    
    // Process the verified event
    await handleWebhookEvent(webhookEvent);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }
}
```

#### Provider-Specific Verification

**Stripe:**
```typescript
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  webhookSecret
);
```

**PayPal:**
```typescript
const isValid = paypal.notification.webhookEvent.verify(
  headers,
  payload,
  webhookId
);
```

**Square:**
```typescript
const isValid = signature === 
  crypto.createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('base64');
```

### Security Best Practices

- ✅ **Always** verify signatures
- ✅ Use HTTPS endpoints only
- ✅ Validate event structure
- ✅ Log all webhook attempts
- ✅ Rate limit webhook endpoints
- ✅ Use API keys for API Gateway
- ✅ Monitor for suspicious patterns

---

## Handling Webhook Events

### Event Router Pattern

```typescript
// In webhook-hooks.ts

export async function handleWebhookEvent(event: StripeEvent) {
  logService.info(`Processing webhook: ${event.type}`, 'WebhookHandler', {
    eventId: event.id,
    type: event.type
  });
  
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await processPaymentIntentSucceeded(event);
        break;
        
      case 'payment_intent.payment_failed':
        await processPaymentIntentFailed(event);
        break;
        
      case 'invoice.paid':
        await processInvoicePaid(event);
        break;
        
      case 'invoice.payment_failed':
        await processInvoicePaymentFailed(event);
        break;
        
      case 'charge.refunded':
        await processChargeRefunded(event);
        break;
        
      default:
        logService.info(`Unhandled event type: ${event.type}`, 'WebhookHandler');
    }
  } catch (error) {
    logService.error(
      `Error processing webhook: ${error.message}`,
      'WebhookHandler',
      { eventId: event.id, error }
    );
    throw error; // Trigger retry
  }
}
```

### Event-Specific Controllers

Create controllers for each event type in `code/controllers/stripe-event-processors/`:

```typescript
// processInvoicePaidEventController.ts

export async function processInvoicePaid(event: StripeEvent) {
  const invoice = event.data.object as Stripe.Invoice;
  
  logService.info('Processing invoice.paid event', 'InvoicePaidController', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid
  });
  
  try {
    // 1. Get policy from Root using metadata
    const policyId = invoice.metadata.rootPolicyId;
    const policy = await rootService.getPolicy(policyId);
    
    // 2. Create payment record in Root
    await rootService.createPayment({
      policyId: policy.id,
      amount: invoice.amount_paid / 100, // Convert cents to dollars
      currency: invoice.currency,
      status: 'succeeded',
      paymentDate: new Date(invoice.status_transitions.paid_at * 1000),
      externalId: invoice.payment_intent as string,
      metadata: {
        invoiceId: invoice.id,
        provider: 'stripe'
      }
    });
    
    logService.info('Invoice payment processed successfully', 'InvoicePaidController');
  } catch (error) {
    logService.error(
      `Failed to process invoice payment: ${error.message}`,
      'InvoicePaidController',
      { invoiceId: invoice.id, error }
    );
    throw error;
  }
}
```

---

## Local Testing

### Using Webhook Testing Tools

#### Option 1: Stripe CLI (Recommended for Stripe)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to http://localhost:3000/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger invoice.paid
```

#### Option 2: ngrok (Works with any provider)

```bash
# Install ngrok
brew install ngrok

# Start local server
npm run dev

# Expose to internet
ngrok http 3000

# Use the ngrok URL as webhook endpoint
https://xxxxx.ngrok.io/webhook
```

#### Option 3: Mock Webhooks

Create test files in `__tests__/fixtures/`:

```typescript
// __tests__/fixtures/stripe-webhooks.ts

export const mockInvoicePaidEvent = {
  id: 'evt_test_123',
  type: 'invoice.paid',
  data: {
    object: {
      id: 'in_test_123',
      customer: 'cus_test_123',
      amount_paid: 5000,
      currency: 'usd',
      status: 'paid',
      metadata: {
        rootPolicyId: 'policy_123'
      }
    }
  }
};
```

Then test in your code:

```typescript
// __tests__/integration/webhook.integration.test.ts

import { processWebhook } from '../../code/webhook-hooks';
import { mockInvoicePaidEvent } from '../fixtures/stripe-webhooks';

describe('Webhook Processing', () => {
  it('should process invoice.paid event', async () => {
    const result = await processWebhook({
      body: JSON.stringify(mockInvoicePaidEvent),
      headers: {
        'stripe-signature': 'test-signature'
      }
    });
    
    expect(result.statusCode).toBe(200);
  });
});
```

---

## Error Handling and Retries

### Retry Strategy

Most providers automatically retry failed webhooks:

**Stripe:**
- Retries for 3 days
- Exponential backoff
- Stops after successful response (2xx)

**Best Practices:**
- Return 200 immediately after processing
- Use idempotency keys to prevent duplicates
- Log all processing attempts
- Handle duplicate events gracefully

### Implementing Idempotency

```typescript
// In your event controller

const processedEvents = new Set<string>();

export async function processInvoicePaid(event: StripeEvent) {
  // Check if already processed
  if (processedEvents.has(event.id)) {
    logService.info('Event already processed, skipping', 'InvoicePaidController', {
      eventId: event.id
    });
    return;
  }
  
  try {
    // Process event
    await doActualProcessing(event);
    
    // Mark as processed
    processedEvents.add(event.id);
  } catch (error) {
    // Don't mark as processed on error - allow retry
    throw error;
  }
}
```

For production, use a persistent store (DynamoDB, Redis) instead of in-memory Set.

### Error Response Codes

Return appropriate status codes:

- **200-299**: Success, don't retry
- **400-499**: Client error, don't retry (except 429)
- **500-599**: Server error, retry

```typescript
export async function webhookHandler(event: any) {
  try {
    await processWebhook(event);
    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    if (error.type === 'validation_error') {
      // Don't retry validation errors
      return { statusCode: 400, body: error.message };
    }
    
    // Retry server errors
    return { statusCode: 500, body: 'Internal Server Error' };
  }
}
```

---

## Monitoring Webhooks

### CloudWatch Metrics

Track webhook metrics:

```typescript
// In webhook handler

import { CloudWatch } from 'aws-sdk';
const cloudwatch = new CloudWatch();

async function recordWebhookMetric(eventType: string, success: boolean) {
  await cloudwatch.putMetricData({
    Namespace: 'CollectionModule',
    MetricData: [{
      MetricName: 'WebhookProcessed',
      Value: success ? 1 : 0,
      Unit: 'Count',
      Dimensions: [{
        Name: 'EventType',
        Value: eventType
      }]
    }]
  }).promise();
}
```

### CloudWatch Alarms

Create alarms for:
- High error rate
- Slow processing time
- Missing webhooks

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name webhook-error-rate \
  --alarm-description "Webhook error rate too high" \
  --metric-name WebhookProcessed \
  --namespace CollectionModule \
  --statistic Average \
  --period 300 \
  --threshold 0.9 \
  --comparison-operator LessThanThreshold
```

### Webhook Dashboard

Track webhook health:
- Total webhooks received
- Success/failure rate
- Processing time
- Events by type
- Retry attempts

---

## Debugging Webhooks

### Common Issues

#### 1. Signature Verification Failed

**Symptoms:**
- 400 responses
- "Invalid signature" errors

**Solutions:**
- Verify webhook secret is correct
- Check you're using raw request body (not parsed JSON)
- Ensure correct header name (`stripe-signature`, `x-square-signature`, etc.)
- Test with provider's CLI tool

#### 2. Webhooks Timing Out

**Symptoms:**
- 504 Gateway Timeout
- Provider shows "failed" status

**Solutions:**
- Increase Lambda timeout
- Optimize slow operations
- Process asynchronously (queue-based)
- Return 200 immediately, process later

#### 3. Duplicate Events

**Symptoms:**
- Same event processed multiple times
- Duplicate payments/updates in Root

**Solutions:**
- Implement idempotency checks
- Use event ID to track processed events
- Check for duplicate external IDs before creating

#### 4. Missing Webhooks

**Symptoms:**
- Events happen but webhooks don't arrive
- Provider shows "not delivered"

**Solutions:**
- Verify endpoint URL is correct and accessible
- Check API Gateway configuration
- Verify Lambda permissions
- Check provider webhook logs

### Debugging Tips

1. **Enable Verbose Logging**

```typescript
logService.debug('Webhook received', 'WebhookHandler', {
  headers: event.headers,
  body: event.body,
  eventType: webhookEvent.type
});
```

2. **Test with Provider Dashboard**
   - Send test events
   - Check delivery logs
   - Review response codes

3. **Check CloudWatch Logs**

```bash
aws logs tail /aws/lambda/your-function --follow --filter-pattern "ERROR"
```

4. **Use Provider CLI Tools**

```bash
# Stripe
stripe listen --forward-to http://localhost:3000
stripe logs tail
```

---

## Webhook Event Reference

### Common Events to Handle

| Event | When to Handle | Action |
|-------|---------------|--------|
| `payment_intent.succeeded` | Payment completed | Create/update payment in Root |
| `payment_intent.payment_failed` | Payment failed | Mark payment as failed in Root |
| `invoice.paid` | Invoice paid | Record payment |
| `invoice.payment_failed` | Invoice payment failed | Update payment status |
| `charge.refunded` | Refund processed | Create refund record |
| `subscription.updated` | Subscription changed | Update policy in Root |
| `subscription.deleted` | Subscription cancelled | Cancel policy in Root |
| `charge.dispute.created` | Dispute opened | Flag payment, notify team |

### Event Priority

**High Priority** (process immediately):
- Payment succeeded/failed
- Refunds
- Disputes

**Medium Priority** (can be delayed):
- Subscription updates
- Invoice created

**Low Priority** (informational):
- Customer updated
- Payment method updated

---

## Testing Checklist

- [ ] Webhook endpoint deployed and accessible
- [ ] Signature verification implemented
- [ ] All required events registered with provider
- [ ] Test events sent and processed successfully
- [ ] Error handling tested
- [ ] Idempotency implemented
- [ ] Logging configured
- [ ] CloudWatch alarms set up
- [ ] Retry logic validated
- [ ] Integration with Root Platform tested
- [ ] Documentation updated

---

## Next Steps

After webhook setup:

1. **Test End-to-End**: Process real transactions
2. **Monitor Performance**: Watch CloudWatch metrics
3. **Handle Edge Cases**: Test failure scenarios
4. **Document Runbook**: Create incident response guide
5. **Set Up Alerts**: Configure notifications

---

## Resources

- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **Webhook Security**: https://stripe.com/docs/webhooks/signatures
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **API Gateway**: https://docs.aws.amazon.com/apigateway/
- **Lambda**: https://docs.aws.amazon.com/lambda/

