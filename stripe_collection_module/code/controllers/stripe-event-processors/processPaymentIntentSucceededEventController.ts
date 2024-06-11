import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessPaymentIntentSucceededEventController {
  /**
   * This updates the payment linked to a payment intent to successful.
   *
   * @param {object} paymentIntent - Incoming paymentIntent from Stripe
   *
   */
  async process(paymentIntent: Stripe.PaymentIntent) {
    Logger.info('Processing Stripe paymentIntent succeededevent');

    if (!paymentIntent.metadata.rootPaymentId) {
      throw new ModuleError(
        `No rootPaymentId found in the metadata of paymentIntent ${paymentIntent.id}.`,
        {
          paymentIntent,
        },
      );
    }

    Logger.info(
      `Updating Root payment to Successful for paymentIntentId ${paymentIntent.id}`,
      {
        paymentIntent,
      },
    );

    await rootClient.SDK.updatePaymentsAsync({
      paymentUpdates: [
        {
          payment_id: paymentIntent.metadata.rootPaymentId,
          status: root.PaymentStatus.Successful,
        },
      ],
    });

    Logger.info(
      `Payments linked to the paymentIntentId ${paymentIntent.id} have been updated to Successful.`,
      {
        paymentIntent,
      },
    );
  }
}

export default ProcessPaymentIntentSucceededEventController;
