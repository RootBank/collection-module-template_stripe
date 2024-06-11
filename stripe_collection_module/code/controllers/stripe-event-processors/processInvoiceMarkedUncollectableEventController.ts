import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import getInvoiceMetadataWithDelay from './processStripeEventController';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessInvoiceMarkedUncollectableEventController {
  /**
   * Process the payment failed events from Stripe and update payments linked to invoice line items.
   *
   * @param {object} invoice - Incoming invoice from Stripe
   *
   */
  async process(invoice: Stripe.Invoice) {
    Logger.info(`Processing Stripe invoice event to update payments on Root`);

    const retrievedInvoice = await getInvoiceMetadataWithDelay(invoice.id);

    if (!retrievedInvoice.metadata?.associatedRootPaymentIds) {
      Logger.warn('** No payments linked to the invoice. Skipping the update.');
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
        throw new ModuleError('No mapping found for invoiceLineItemId', {
          invoiceId: retrievedInvoice.id,
          invoiceLineItemId: item.id,
        });
      }

      const { rootPaymentId } = mapping;

      Logger.info(
        `Updating Root payment to Failed for invoiceLineItemId ${item.id}`,
      );

      await rootClient.SDK.updatePaymentsAsync({
        paymentUpdates: [
          {
            payment_id: rootPaymentId,
            status: root.PaymentStatus.Failed,
            failure_reason:
              invoice.last_finalization_error?.message ||
              'Stripe payment failed to collect',
            failure_action: root.FailureAction.BlockPaymentMethod,
          },
        ],
      });
    }

    Logger.info(
      `All payments linked to the invoice have been updated to Failed.`,
    );
  }
}

export default ProcessInvoiceMarkedUncollectableEventController;
