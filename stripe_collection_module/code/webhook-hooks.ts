/**
 * Webhook Handler for Stripe Events
 *
 * This module handles incoming webhook requests from Stripe.
 * It verifies signatures and routes events to appropriate controllers.
 *
 * Architecture:
 * - Signature verification
 * - Event routing via dependency injection
 * - Minimal logic - delegates to controllers
 */

import * as crypto from 'crypto';
import Stripe from 'stripe';
import { getContainer } from './core/container.setup';
import { ServiceToken } from './core/container';
import { LogService } from './services/log.service';
import { StripeEvents } from './interfaces/stripe-events';
import { InvoicePaidController } from './controllers/stripe-event-processors/invoice-paid.controller';
import { getConfigService } from './services/config-instance';

/**
 * Verify Stripe webhook signature
 */
const verifyWebhookSignature = (request: any): boolean => {
  const { headers, body } = request.request;
  const stripeSignature: string = headers['stripe-signature'];

  if (!stripeSignature) {
    return false;
  }

  // Parse signature header: t=timestamp,v1=signature
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
    return false;
  }

  // Verify signature
  const config = getConfigService();
  const webhookSecret = config.get('stripeWebhookSigningSecret');
  const signedPayload = `${signature.t}.${body.toString('utf8')}`;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.v1, 'hex') as unknown as Uint8Array,
      Buffer.from(expectedSignature, 'hex') as unknown as Uint8Array
    );
  } catch (error) {
    return false;
  }
};

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
    // Verify webhook signature
    if (!verifyWebhookSignature(request)) {
      logService.warn(
        'Webhook signature verification failed',
        'WebhookHandler'
      );
      return {
        response: {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid signature' }),
        },
      };
    }

    // Parse webhook event
    const event = JSON.parse(request.request.body as string);
    logService.info('Received Stripe webhook', 'WebhookHandler', {
      eventType: event.type,
      eventId: event.id,
    });

    // Route to appropriate controller
    switch (event.type) {
      case StripeEvents.InvoicePaid: {
        const controller = container.resolve<InvoicePaidController>(
          ServiceToken.INVOICE_PAID_CONTROLLER
        );
        await controller.handle(event.data.object as Stripe.Invoice);
        break;
      }

      // Add more event handlers here as needed
      // case StripeEvents.PaymentIntentSucceeded: {
      //   const controller = container.resolve<PaymentIntentSucceededController>(
      //     ServiceToken.PAYMENT_INTENT_SUCCEEDED_CONTROLLER
      //   );
      //   await controller.handle(event.data.object as Stripe.PaymentIntent);
      //   break;
      // }

      default:
        logService.warn('Unhandled Stripe event type', 'WebhookHandler', {
          eventType: event.type,
        });
    }

    return {
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ received: true }),
      },
    };
  } catch (error: any) {
    logService.error('Error processing webhook', 'WebhookHandler', {
      error: error.message,
    });

    return {
      response: {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal server error' }),
      },
    };
  }
};
