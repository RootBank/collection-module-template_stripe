# Stripe Implementation Guide

This guide explains how to complete the Stripe integration in this collection module template.

## Overview

The template provides a complete structure with stub implementations. You'll need to implement the actual Stripe integration by completing the service methods, configuring the Stripe client, and implementing webhook handlers.

---

## Implementation Strategy

### 1. Understand the Template Structure

The template follows a clean architecture:

```
Stripe SDK Client → Stripe Service → Controllers → Root Platform Integration
       ↓
    Root API
```

### What's Already Done

✅ **Architecture**:
- Dependency injection container
- Configuration management
- Logging infrastructure
- Error handling patterns

✅ **Structure**:
- Service stubs with method signatures
- Event processor templates
- Test infrastructure
- Documentation

### What You Need to Implement

❌ **Stripe Integration**:
- Complete service stub methods
- Configure Stripe SDK client
- Implement webhook handlers
- Add data transformation logic

---

## Step-by-Step Implementation

### Step 1: Configure Stripe Client

**File**: `code/clients/stripe-client.ts`

Complete the Stripe client initialization:

```typescript
import Stripe from 'stripe';
import { getConfigService } from '../services/config-instance';

export class StripeClient {
  private stripe: Stripe;

  constructor(apiKey?: string) {
    const config = getConfigService();
    const key = apiKey || config.get('stripeSecretKey');
    
    // Initialize Stripe SDK
    this.stripe = new Stripe(key, {
      apiVersion: '2023-10-16', // Use latest stable version
      typescript: true,
    });
  }

  /**
   * Get the Stripe SDK instance
   */
  public getClient(): Stripe {
    return this.stripe;
  }

  /**
   * Verify webhook signature
   */
  public constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
```

### Step 2: Implement Stripe Service Methods

**File**: `code/services/stripe.service.ts`

Complete the stub methods with actual Stripe API calls:

```typescript
/**
 * Create a Stripe customer
 */
async createCustomer(params: {
  email?: string;
  name?: string;
  phone?: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}): Promise<StripeCustomer> {
  this.logService.info('Creating Stripe customer', 'CustomerService', params);

  try {
    const customer = await this.stripeClient.getClient().customers.create({
      email: params.email,
      name: params.name,
      phone: params.phone,
      payment_method: params.paymentMethod,
      metadata: params.metadata,
    });

    this.logService.info('Customer created successfully', 'CustomerService', {
      customerId: customer.id,
    });

    return this.mapStripeCustomer(customer);
  } catch (error) {
    this.logService.error(
      `Failed to create customer: ${error.message}`,
      'CustomerService',
      { error }
    );
    throw error;
  }
}

/**
 * Map Stripe customer to domain model
 */
private mapStripeCustomer(stripeCustomer: Stripe.Customer): StripeCustomer {
  return {
    id: stripeCustomer.id,
    email: stripeCustomer.email,
    name: stripeCustomer.name,
    phone: stripeCustomer.phone,
    defaultPaymentMethodId: stripeCustomer.invoice_settings?.default_payment_method as string,
    created: new Date(stripeCustomer.created * 1000),
    metadata: stripeCustomer.metadata,
  };
}
```

**Complete these methods**:
- `createCustomer()` - Create Stripe customer
- `getCustomer()` - Retrieve customer by ID
- `updateCustomer()` - Update customer details
- `createSubscription()` - Create recurring subscription
- `getSubscription()` - Get subscription details
- `updateSubscription()` - Update subscription
- `cancelSubscription()` - Cancel subscription
- `createPayment()` - Create one-time payment
- `refundPayment()` - Process refund
- `attachPaymentMethod()` - Attach payment method to customer

### Step 3: Implement Webhook Event Processors

**File**: `code/controllers/stripe-event-processors/processInvoicePaidEventController.ts`

Implement handlers for each Stripe webhook event:

```typescript
import { getLogService } from '../../services/log-instance';
import { RootService } from '../../services/root.service';
import Stripe from 'stripe';

export async function processInvoicePaid(event: Stripe.Event): Promise<void> {
  const logService = getLogService();
  const invoice = event.data.object as Stripe.Invoice;
  
  logService.info('Processing invoice.paid event', 'InvoicePaidController', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid,
  });

  try {
    // 1. Get Root policy ID from invoice metadata
    const rootPolicyId = invoice.metadata?.rootPolicyId;
    
    if (!rootPolicyId) {
      logService.warn('No Root policy ID in invoice metadata', 'InvoicePaidController');
      return;
    }

    // 2. Create payment record in Root
    const rootService = new RootService(/* inject dependencies */);
    await rootService.createPayment({
      policyId: rootPolicyId,
      amount: invoice.amount_paid / 100, // Convert cents to dollars
      currency: invoice.currency,
      status: 'succeeded',
      paymentDate: new Date(invoice.status_transitions.paid_at! * 1000),
      externalId: invoice.payment_intent as string,
      metadata: {
        invoiceId: invoice.id,
        provider: 'stripe',
      },
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

**Implement these event processors**:
- `processInvoicePaidEventController.ts` - Payment succeeded
- `processInvoicePaymentFailedEventController.ts` - Payment failed
- `processInvoiceCreatedEventController.ts` - Invoice created
- `processPaymentIntentSucceededEventController.ts` - Payment intent succeeded
- `processPaymentIntentFailedEventController.ts` - Payment intent failed
- `processChargeDisputedEventController.ts` - Dispute created
- `processInvoiceChargeRefundedEventController.ts` - Refund processed
- `processSubscriptionScheduleUpdatedEventController.ts` - Subscription changed

### Step 4: Wire Webhook Handler

**File**: `code/webhook-hooks.ts`

Connect webhook events to processors:

```typescript
import { getLogService } from './services/log-instance';
import { getConfigService } from './services/config-instance';
import { StripeClient } from './clients/stripe-client';
import Stripe from 'stripe';

// Import event processors
import { processInvoicePaid } from './controllers/stripe-event-processors/processInvoicePaidEventController';
import { processInvoicePaymentFailed } from './controllers/stripe-event-processors/processInvoicePaymentFailedEventController';
// ... import other processors

export async function processStripeWebhook(event: any): Promise<any> {
  const logService = getLogService();
  const config = getConfigService();

  try {
    // 1. Verify webhook signature
    const stripeClient = new StripeClient();
    const signature = event.headers['stripe-signature'];
    const webhookSecret = config.get('stripeWebhookSigningSecret');
    
    const stripeEvent = stripeClient.constructWebhookEvent(
      event.body,
      signature,
      webhookSecret
    );

    logService.info(`Processing Stripe webhook: ${stripeEvent.type}`, 'WebhookHandler', {
      eventId: stripeEvent.id,
    });

    // 2. Route to appropriate processor
    switch (stripeEvent.type) {
      case 'invoice.paid':
        await processInvoicePaid(stripeEvent);
        break;

      case 'invoice.payment_failed':
        await processInvoicePaymentFailed(stripeEvent);
        break;

      case 'payment_intent.succeeded':
        await processPaymentIntentSucceeded(stripeEvent);
        break;

      case 'payment_intent.payment_failed':
        await processPaymentIntentFailed(stripeEvent);
        break;

      case 'charge.dispute.created':
        await processChargeDisputed(stripeEvent);
        break;

      default:
        logService.info(`Unhandled event type: ${stripeEvent.type}`, 'WebhookHandler');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    logService.error(`Webhook processing failed: ${error.message}`, 'WebhookHandler');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
```

### Step 5: Implement Lifecycle Hooks

**File**: `code/lifecycle-hooks/index.ts`

Connect Root Platform lifecycle hooks to Stripe operations:

```typescript
import { getLogService } from '../services/log-instance';
import { StripeService } from '../services/stripe.service';
import { RootService } from '../services/root.service';

/**
 * Called when a payment method is assigned to a policy
 */
export async function afterPolicyPaymentMethodAssigned(event: any): Promise<void> {
  const logService = getLogService();
  
  logService.info('Processing payment method assignment', 'LifecycleHooks', {
    policyId: event.policyId,
    paymentMethodId: event.paymentMethodId,
  });

  try {
    // 1. Get policy details from Root
    const rootService = new RootService(/* dependencies */);
    const policy = await rootService.getPolicy(event.policyId);
    const policyholder = await rootService.getPolicyholder(policy.policyholderId);

    // 2. Create or get Stripe customer
    const stripeService = new StripeService(/* dependencies */);
    let customerId = policy.metadata?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripeService.createCustomer({
        email: policyholder.email,
        name: `${policyholder.firstName} ${policyholder.lastName}`,
        phone: policyholder.phone,
        metadata: {
          rootPolicyId: policy.id,
          rootPolicyholderId: policyholder.id,
        },
      });
      customerId = customer.id;

      // Update policy with Stripe customer ID
      await rootService.updatePolicy(policy.id, {
        metadata: {
          ...policy.metadata,
          stripeCustomerId: customerId,
        },
      });
    }

    // 3. Create Stripe subscription
    const subscription = await stripeService.createSubscription({
      customerId,
      priceId: policy.metadata?.stripePriceId,
      amount: policy.monthlyPremium,
      currency: policy.currency,
      metadata: {
        rootPolicyId: policy.id,
      },
    });

    // 4. Update policy with subscription ID
    await rootService.updatePolicy(policy.id, {
      metadata: {
        ...policy.metadata,
        stripeSubscriptionId: subscription.id,
      },
    });

    logService.info('Payment method assignment completed', 'LifecycleHooks');
  } catch (error) {
    logService.error(`Failed to process payment method assignment: ${error.message}`, 'LifecycleHooks');
    throw error;
  }
}
```

### Step 6: Add Data Transformation

**File**: `code/adapters/stripe-to-root-adapter.ts`

Implement adapters to transform Stripe data to Root format:

```typescript
import Stripe from 'stripe';
import { RootPayment, RootPaymentStatus } from '../interfaces/root-payment';

/**
 * Map Stripe payment intent to Root payment
 */
export function mapStripePaymentIntentToRootPayment(
  paymentIntent: Stripe.PaymentIntent
): Partial<RootPayment> {
  return {
    externalId: paymentIntent.id,
    amount: paymentIntent.amount / 100, // Convert cents to dollars
    currency: paymentIntent.currency.toUpperCase(),
    status: mapStripePaymentStatus(paymentIntent.status),
    paymentDate: new Date(paymentIntent.created * 1000),
    metadata: {
      provider: 'stripe',
      paymentMethod: paymentIntent.payment_method,
      receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
    },
  };
}

/**
 * Map Stripe payment status to Root status
 */
function mapStripePaymentStatus(stripeStatus: string): RootPaymentStatus {
  const statusMap: Record<string, RootPaymentStatus> = {
    'succeeded': 'succeeded',
    'processing': 'pending',
    'requires_payment_method': 'pending',
    'requires_confirmation': 'pending',
    'requires_action': 'pending',
    'canceled': 'canceled',
    'failed': 'failed',
  };

  return statusMap[stripeStatus] || 'pending';
}
```

### Step 7: Add Input Validation

**File**: `code/validation/stripe-schemas.ts`

Add Joi validation schemas for Stripe data:

```typescript
import Joi from 'joi';

export const createCustomerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(200).required(),
  phone: Joi.string().optional(),
  metadata: Joi.object().optional(),
});

export const createSubscriptionSchema = Joi.object({
  customerId: Joi.string().required(),
  priceId: Joi.string().optional(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  interval: Joi.string().valid('day', 'week', 'month', 'year').required(),
  metadata: Joi.object().optional(),
});

/**
 * Validate and return typed data
 */
export async function validateCreateCustomer(data: unknown) {
  return await createCustomerSchema.validateAsync(data);
}
```

---

## Testing Your Implementation

### Unit Tests

Test each service method in isolation:

```typescript
describe('CustomerService', () => {
  let customerService: CustomerService;
  let mockStripeClient: jest.Mocked<StripeClient>;
  let mockLogService: jest.Mocked<LogService>;

  beforeEach(() => {
    mockStripeClient = createMockStripeClient();
    mockLogService = createMockLogService();
    customerService = new CustomerService(mockLogService, mockStripeClient);
  });

  describe('createCustomer', () => {
    it('should create a Stripe customer', async () => {
      const params = {
        email: 'test@example.com',
        name: 'Test User',
      };

      mockStripeClient.getClient().customers.create.mockResolvedValue({
        id: 'cus_123',
        email: params.email,
        name: params.name,
      } as any);

      const customer = await stripeService.createCustomer(params);

      expect(customer.id).toBe('cus_123');
      expect(mockStripeClient.getClient().customers.create).toHaveBeenCalledWith({
        email: params.email,
        name: params.name,
      });
    });
  });
});
```

### Integration Tests

Test complete workflows:

```typescript
describe('Stripe Integration', () => {
  it('should create customer and subscription', async () => {
    // 1. Create customer
    const customer = await stripeService.createCustomer({
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(customer.id).toBeDefined();

    // 2. Create subscription
    const subscription = await stripeService.createSubscription({
      customerId: customer.id,
      amount: 1000,
      currency: 'usd',
      interval: 'month',
    });

    expect(subscription.id).toBeDefined();
    expect(subscription.customerId).toBe(customer.id);
  });
});
```

---

## Common Patterns

### Retry Logic for API Calls

```typescript
import { retryWithBackoff } from '../utils/retry';

async createCustomer(params: any) {
  return retryWithBackoff(
    () => this.stripeClient.getClient().customers.create(params),
    {
      maxRetries: 3,
      initialDelay: 1000,
      shouldRetry: (error) => error.statusCode >= 500 || error.code === 'ETIMEDOUT',
    }
  );
}
```

### Idempotency for Webhooks

```typescript
const processedEvents = new Set<string>();

export async function processInvoicePaid(event: Stripe.Event) {
  // Check if already processed
  if (processedEvents.has(event.id)) {
    logService.info('Event already processed', 'InvoicePaidController');
    return;
  }

  try {
    await doActualProcessing(event);
    processedEvents.add(event.id);
  } catch (error) {
    // Don't mark as processed - allow retry
    throw error;
  }
}
```

### Error Handling

```typescript
try {
  await stripeService.createCustomer(params);
} catch (error) {
  if (error.type === 'StripeCardError') {
    // Customer-facing error - don't retry
    throw new ValidationError('Card declined', { code: error.code });
  } else if (error.statusCode >= 500) {
    // Server error - retry
    throw new ServerError('Stripe API error', { error: error.message });
  } else {
    // Unknown error
    throw error;
  }
}
```

---

## Implementation Checklist

- [ ] Configure Stripe client with API key
- [ ] Create service layers as needed for your business logic
- [ ] Create webhook event controllers for all events you need to handle
- [ ] Wire webhook handler with event routing
- [ ] Implement lifecycle hooks for your specific use case
- [ ] Add data transformation adapters
- [ ] Add input validation schemas
- [ ] Write unit tests for all services
- [ ] Write integration tests for workflows
- [ ] Test with Stripe test mode
- [ ] Configure webhook URL in Stripe Dashboard
- [ ] Test webhook delivery
- [ ] Deploy and monitor

---

## Resources

- **Stripe API Documentation**: https://stripe.com/docs/api
- **Stripe Webhooks Guide**: https://stripe.com/docs/webhooks
- **Stripe Testing**: https://stripe.com/docs/testing
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Stripe Node.js Library**: https://github.com/stripe/stripe-node

---

**Ready to build! 🚀**
