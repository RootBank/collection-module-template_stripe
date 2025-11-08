/**
 * Webhook Handler for Stripe Events
 *
 * This module handles incoming webhook requests from Stripe.
 * It verifies signatures, validates events, and routes them to appropriate controllers.
 *
 * Architecture:
 * - Uses dependency injection for controller resolution
 * - Delegates to controllers for event processing
 * - Focuses on routing and authentication only
 */

import * as crypto from 'crypto';
import Stripe from 'stripe';
import { getContainer } from './core/container.setup';
import { ServiceToken } from './core/container';
import { LogService } from './services/log.service';
import { StripeEvents } from './interfaces/stripe-events';
import { InvoicePaidController } from './controllers/stripe-event-processors/invoice-paid.controller';
import { getConfigService } from './services/config-instance';
import ModuleError from './utils/error';
import rootClient from './clients/root-client';

/**
 * Verify Stripe webhook signature
 *
 * @param request - Incoming webhook request
 * @returns Response object if verification fails, undefined if successful
 */
const verifyWebhookSignature = (request: any) => {
  const { headers } = request.request;
  const stripeSignature: string = headers['stripe-signature'];

  if (!stripeSignature) {
    return {
      response: {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing stripe-signature header' }),
      },
    };
  }

  // Parse Stripe signature header
  // Format: t=timestamp,v1=signature
  const signature: { t?: string; v1?: string } = {
    t: undefined,
    v1: undefined,
  };
  const elements = stripeSignature.split(',');
  for (const rawElement of elements) {
    const [prefix, value] = rawElement.split('=');
    if (prefix === 't' || prefix === 'v1') {
      signature[prefix] = value;
    }
  }

  if (!signature.t || !signature.v1) {
    return {
      response: {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid stripe-signature format' }),
      },
    };
  }

  const { body } = request.request;
  const signedPayload = `${signature.t}.${body.toString('utf8')}`;

  // Get webhook secret from configuration
  const config = getConfigService();
  const webhookSecret = config.get('stripeWebhookSigningSecret');

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  // Verify signature using timing-safe comparison
  try {
    const signatureVerified = crypto.timingSafeEqual(
      Buffer.from(signature.v1, 'hex') as unknown as Uint8Array,
      Buffer.from(expectedSignature, 'hex') as unknown as Uint8Array
    );

    if (!signatureVerified) {
      return {
        response: {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid signature' }),
        },
      };
    }
  } catch (error) {
    // Buffer length mismatch or other error
    return {
      response: {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Signature verification failed' }),
      },
    };
  }

  // Signature verified successfully
  return undefined;
};

/**
 * Create success response
 */
const successResponse = () => ({
  response: {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ received: true }),
  },
});

/**
 * Process incoming Stripe webhook request
 *
 * @param request - Incoming webhook request from Stripe
 * @returns Response object
 */
export const processWebhookRequest = async (request: any) => {
  const container = getContainer();
  const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);

  try {
    // Step 1: Verify webhook signature
    logService.debug('Verifying webhook signature', 'WebhookHandler');
    const authResult = verifyWebhookSignature(request);
    if (authResult) {
      logService.warn(
        'Webhook signature verification failed',
        'WebhookHandler'
      );
      return authResult;
    }

    // Step 2: Parse webhook body
    const parsedBody = JSON.parse(request.request.body as string);
    const eventType: string = parsedBody.type;

    logService.info('Received Stripe webhook', 'WebhookHandler', {
      eventType,
      eventId: parsedBody.id,
    });

    // Step 3: Extract policy ID from event
    // Different event types store policy ID in different locations
    const dataObject = parsedBody.data.object;
    let policyId: string | undefined;

    switch (eventType) {
      case StripeEvents.InvoiceCreated:
      case StripeEvents.InvoicePaid:
        policyId = dataObject.metadata?.rootPolicyId;
        break;
      case StripeEvents.PaymentIntentSucceeded:
      case StripeEvents.PaymentIntentFailed:
        policyId = dataObject.metadata?.rootPolicyId;
        break;
      // TODO: Add more event types as needed for your implementation
      default:
        break;
    }

    if (!policyId) {
      logService.info(
        'No policy ID found in event, skipping',
        'WebhookHandler',
        { eventType }
      );
      return successResponse();
    }

    logService.debug('Found policy ID in event', 'WebhookHandler', {
      policyId,
      eventType,
    });

    // Step 4: Verify policy is assigned to this collection module
    let isAssigned = false;
    try {
      const paymentMethod = await rootClient.SDK.getPolicyPaymentMethod({
        policyId,
      });
      isAssigned = !!paymentMethod.collection_module_definition_id;
    } catch (error: any) {
      logService.warn(
        'Failed to check payment method for policy',
        'WebhookHandler',
        { policyId, error: error.message }
      );
    }

    if (!isAssigned) {
      logService.info(
        'Policy not assigned to this collection module, skipping',
        'WebhookHandler',
        { policyId, eventType }
      );
      return successResponse();
    }

    // Step 5: Route event to appropriate controller
    const payload = parsedBody.data.object;

    logService.info('Processing Stripe event', 'WebhookHandler', {
      eventType,
      policyId,
    });

    switch (eventType) {
      case StripeEvents.InvoicePaid: {
        const controller = container.resolve<InvoicePaidController>(
          ServiceToken.INVOICE_PAID_CONTROLLER
        );
        await controller.handle(payload as Stripe.Invoice);
        break;
      }

      // TODO: Add more event handlers as you implement them
      // Example:
      // case StripeEvents.InvoicePaymentFailed: {
      //   const controller = container.resolve<InvoicePaymentFailedController>(
      //     ServiceToken.INVOICE_PAYMENT_FAILED_CONTROLLER,
      //   );
      //   await controller.handle(payload as Stripe.Invoice);
      //   break;
      // }

      default:
        logService.warn('Unhandled Stripe event type', 'WebhookHandler', {
          eventType,
        });
        // Return success even for unhandled events to prevent retries
        return successResponse();
    }

    logService.info('Successfully processed Stripe event', 'WebhookHandler', {
      eventType,
      policyId,
    });

    return successResponse();
  } catch (error: any) {
    logService.error('Error processing webhook', 'WebhookHandler', {
      error: error.message,
      stack: error.stack,
    });

    // Re-throw as ModuleError for consistent error handling
    throw new ModuleError('Webhook processing failed', {
      error: error.message,
      stack: error.stack,
    });
  }
};
