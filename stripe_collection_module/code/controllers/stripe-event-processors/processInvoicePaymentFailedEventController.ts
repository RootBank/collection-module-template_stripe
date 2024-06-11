import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import getInvoiceMetadataWithDelay from './processStripeEventController';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessInvoicePaymentFailedEventController {
  /**
   * This sends payment failed email on the Root API.
   *
   * @param {object} invoice - Incoming invoice from Stripe
   *
   */
  async process(invoice: Stripe.Invoice) {
    Logger.info(
      `Processing Stripe invoice.payment_failed event to send comms on Root`,
      {
        invoice,
      },
    );

    const retrievedInvoice = await getInvoiceMetadataWithDelay(invoice.id);

    if (!retrievedInvoice.metadata?.associatedRootPaymentIds) {
      Logger.warn(
        `No payments linked to the invoice. Skipping sending failed payment emails..`,
      );
      return;
    }

    // Check if the invoice metadata has associatedRootPaymentIds
    const rootPaymentToLineItemMappings = JSON.parse(
      retrievedInvoice.metadata.associatedRootPaymentIds,
    );
    for (const item of retrievedInvoice.lines.data) {
      // Find the corresponding mapping for the invoice line item
      const mapping = rootPaymentToLineItemMappings.find(
        (mapping: any) => mapping.invoiceLineItemId === item.id,
      );

      if (!mapping) {
        throw new ModuleError(
          `No mapping found for invoiceLineItemId ${item.id} on invoice ${retrievedInvoice.id}.`,
          {
            retrievedInvoice,
            item,
          },
        );
      }
      const { rootPaymentId } = mapping;

      Logger.info(
        `Sending failed payment email for invoiceLineItemId ${item.id}`,
      );

      await rootClient.SDK.triggerCustomNotificationEvent({
        customEventKey: 'failed_payment_retry',
        body: {
          custom_event_type: root.CustomEventType.Payment,
          payment_id: rootPaymentId,
        },
      });
    }

    Logger.info(
      `Emails have been sent for all failed payments linked to the invoice.`,
    );
  }
}

export default ProcessInvoicePaymentFailedEventController;
