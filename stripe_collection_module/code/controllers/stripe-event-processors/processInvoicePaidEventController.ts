import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import StripeClient from '../../clients/stripe-client';
import rootClient from '../../clients/root-client';
import Logger from '../../utils/logger';
import ModuleError from '../../utils/error';

export default class ProcessInvoicePaidEventController {
  stripeClient: StripeClient;

  constructor() {
    this.stripeClient = new StripeClient();
  }

  /**
   * This updates the payments linked to invoice line items on the Root API to successful.
   *
   * @param {object} invoice - Incoming invoice from Stripe
   *
   */
  async process(invoice: Stripe.Invoice) {
    Logger.info('Processing Stripe invoice event to update payments on Root', {
      invoice,
    });

    const retrievedInvoice =
      await this.stripeClient.stripeSDK.invoices.retrieve(invoice.id);

    Logger.info('Retrieved invoice from Stripe', {
      invoice: retrievedInvoice,
    });

    if (retrievedInvoice.amount_due === 0) {
      Logger.info(
        `Invoice ${retrievedInvoice.id} has a ${retrievedInvoice.amount_due} amount_due. Payments already recorded on the InvoiceCreated event. Skipping update..`,
      );
      return;
    }

    if (!retrievedInvoice.metadata?.associatedRootPaymentIds) {
      Logger.warn('No payments linked to the invoice. Skipping update..');
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
          'No mapping found for invoiceLineItemId ${item.id} on invoice ${retrievedInvoice.id}.',
        );
      }

      const { rootPaymentId } = mapping;

      Logger.info(
        `Updating Root payment to Successful for invoiceLineItemId ${item.id}`,
      );

      await rootClient.SDK.updatePaymentsAsync({
        paymentUpdates: [
          {
            payment_id: rootPaymentId,
            status: root.PaymentStatus.Successful,
          },
        ],
      });
    }

    Logger.info(
      `** All payments linked to the invoice ${retrievedInvoice.id} have been updated to Successful.`,
    );
  }
}
