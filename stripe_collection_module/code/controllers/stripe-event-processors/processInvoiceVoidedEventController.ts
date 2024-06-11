import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import getInvoiceMetadataWithDelay from './processStripeEventController';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

class ProcessInvoiceVoidedEventController {
  /**
   * Process the payment failed events from Stripe and update payments linked to invoice line items.
   *
   * @param {object} invoice - Incoming invoice from Stripe
   *
   */
  async process(invoice: Stripe.Invoice) {
    Logger.info(
      `Processing Stripe invoice.voided event to update payments on Root`,
      {
        invoice,
      },
    );

    const retrievedInvoice = await getInvoiceMetadataWithDelay(invoice.id);

    if (!retrievedInvoice.metadata?.associatedRootPaymentIds) {
      Logger.warn(`No payments linked to the invoice. Skipping update..`);
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
            item,
            retrievedInvoice,
          },
        );
      }

      const { rootPaymentId } = mapping;

      Logger.info(
        `Updating Root payment to Failed for invoiceLineItemId ${item.id}`,
      );

      try {
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
      } catch (error: any) {
        throw new ModuleError(
          `Failed to update the Root payment ${rootPaymentId}: ${error.message}`,
          {
            rootPaymentId,
            error,
          },
        );
      }
    }

    Logger.info(
      `All payments linked to the invoice ${retrievedInvoice.id} have been updated to Failed.`,
    );
  }
}

export default ProcessInvoiceVoidedEventController;
