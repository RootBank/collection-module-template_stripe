import ProcessInvoiceCreatedEventController from './controllers/stripe-event-processors/processInvoiceCreatedEventController';
import ProcessInvoicePaidEventController from './controllers/stripe-event-processors/processInvoicePaidEventController';
import * as crypto from 'crypto';
import { StripeEvents } from './interfaces';

import {
  getPolicyIdFromStripeEvent,
  isPolicyPaymentMethodLinkedToCollectionModule,
} from './utils';
import ProcessInvoicePaymentFailedEventController from './controllers/stripe-event-processors/processInvoicePaymentFailedEventController';
import ProcessSubscriptionScheduleUpdatedEventController from './controllers/stripe-event-processors/processSubscriptionScheduleUpdatedEventController';
import ProcessInvoiceMarkedUncollectableEventController from './controllers/stripe-event-processors/processInvoiceMarkedUncollectableEventController';
import ProcessPaymentIntentSucceededEventController from './controllers/stripe-event-processors/processPaymentIntentSucceededEventController';
import ProcessInvoiceChargeRefundedEventController from './controllers/stripe-event-processors/processInvoiceChargeRefundedEventController';
import Stripe from 'stripe';
import Config from './config';
import Logger from './utils/logger';
import ModuleError from './utils/error';

const authWebhookRequest = async (request: any) => {
  // https://stripe.com/docs/webhooks/signatures#verify-manually
  const { headers } = request.request;
  const signature: any = { t: undefined, v1: undefined };
  headers['stripe-signature'].split(',').map((rawElement: any) => {
    const [prefix, value] = rawElement.split('=');
    if (['t', 'v1'].includes(prefix)) {
      signature[prefix] = value;
    }
  });

  const { body } = request.request;

  const signedPayload = `${signature.t}.${body.toString('utf8')}`;

  const expectedSignature = crypto
    .createHmac('sha256', Config.env.stripeWebhookSigningSecret)
    .update(signedPayload)
    .digest('hex');

  // Compare the expected signature with the received signature
  const signatureVerified = crypto.timingSafeEqual(
    Buffer.from(signature.v1, 'hex'),
    Buffer.from(expectedSignature, 'hex'),
  );

  if (!signatureVerified) {
    return {
      response: {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    };
  }
};

/**
 * @typedef {Object} Request
 * @property {string | null} body - The incoming request's body
 * @property {Record<string, any>} headers - An object containing the incoming request's body
 * @property {string} method - The HTTP method used to make to incoming request (e.g. "POST")
 */

/**
 * @typedef {Object} Response
 * @property {number} status - The response status code (valid range is 200 to 599)
 * @property {string} body - The response body
 */

/**
 * @typedef {Object} ProcessWebhookRequestResult
 * @property {Response} response - The response object
 */

/**
 * Process incoming webhook request.
 *
 * @param {Request} request
 * @returns {ProcessWebhookRequestResult}
 */
export const processWebhookRequest = async (request: any) => {
  const authResult = await authWebhookRequest(request);
  if (authResult) {
    return authResult;
  }

  const parsedBody = JSON.parse(request.request.body);
  // When handling a new Stripe event, please check getPolicyIdFromStripeEvent
  // So the event data can be handled in that function too
  const policyId = await getPolicyIdFromStripeEvent(parsedBody);
  Logger.info(`policyId from stripe event: ${policyId}`);

  if (!policyId) {
    Logger.info('No policyId found in the event', {
      event: parsedBody,
    });

    return {
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    };
  }

  Logger.info(`Processing stripe event of type: ${parsedBody.type}`, {
    policyId,
    event: parsedBody,
  });

  const assignedToCollectionModule =
    await isPolicyPaymentMethodLinkedToCollectionModule(policyId);

  if (!assignedToCollectionModule) {
    Logger.debug(
      `Ignoring this request as this policy payment method has not been assigned a collection module - policyId: ${policyId}`,
    );

    return {
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    };
  }

  Logger.debug(`Processing stripe event of type: ${parsedBody.type}`, {
    policyId,
    event: parsedBody,
  });

  try {
    const payload = parsedBody.data.object;

    /**
     * Add / remove the Stripe event types that you want to handle in the switch statement below.
     */
    switch (parsedBody.type) {
      case StripeEvents.InvoiceCreated: {
        await new ProcessInvoiceCreatedEventController().process(
          payload as Stripe.Invoice,
        );
        break;
      }

      case StripeEvents.InvoicePaid: {
        await new ProcessInvoicePaidEventController().process(
          payload as Stripe.Invoice,
        );
        break;
      }

      case StripeEvents.InvoicePaymentFailed: {
        await new ProcessInvoicePaymentFailedEventController().process(
          payload as Stripe.Invoice,
        );
        break;
      }

      case StripeEvents.SubscriptionScheduleUpdated: {
        await new ProcessSubscriptionScheduleUpdatedEventController().process(
          payload as Stripe.SubscriptionSchedule,
        );
        break;
      }

      case StripeEvents.InvoiceVoided:
      case StripeEvents.InvoiceMarkedUncollectible: {
        await new ProcessInvoiceMarkedUncollectableEventController().process(
          payload as Stripe.Invoice,
        );
        break;
      }

      case StripeEvents.ChargeRefunded: {
        await new ProcessInvoiceChargeRefundedEventController().process(
          payload as Stripe.Charge,
        );
        break;
      }

      case StripeEvents.PaymentIntentSucceeded: {
        await new ProcessPaymentIntentSucceededEventController().process(
          payload as Stripe.PaymentIntent,
        );
        break;
      }

      default:
        // Unexpected event type
        throw new ModuleError(
          `Collection module does not handle event type '${parsedBody.type}'.`,
        );
    }

    return {
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    };
  } catch (error) {
    throw new ModuleError(
      `Error processing stripe event of type: ${parsedBody.type}`,
      {
        error,
        event: parsedBody,
      },
    );
  }
};
