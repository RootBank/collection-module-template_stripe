/**
 * Invoice Paid Event Controller
 *
 * Handles Stripe invoice.paid webhook events.
 * When a Stripe invoice is paid, this updates the associated Root payments to successful.
 *
 * Architecture:
 * - Uses dependency injection for testability
 * - Delegates business logic to services
 * - Focuses on orchestration only
 */

import Stripe from 'stripe';
import { PaymentStatus } from '@rootplatform/node-sdk';
import { LogService } from '../../services/log.service';
import { RootService } from '../../services/root.service';
import StripeClient from '../../clients/stripe-client';

interface InvoicePaymentMapping {
  rootPaymentId: string;
  invoiceLineItemId: string;
}

export class InvoicePaidController {
  constructor(
    private readonly logService: LogService,
    private readonly rootService: RootService,
    private readonly stripeClient: StripeClient
  ) {}

  /**
   * Handle invoice.paid webhook event
   *
   * @param invoice - Stripe invoice object from webhook
   */
  async handle(invoice: Stripe.Invoice): Promise<void> {
    this.logService.info(
      'Processing invoice.paid event',
      'InvoicePaidController',
      {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
      }
    );

    // 1. Validate invoice has amount to process
    if (invoice.amount_due === 0) {
      this.logService.info(
        'Invoice has zero amount_due, skipping (already processed on invoice.created)',
        'InvoicePaidController',
        { invoiceId: invoice.id }
      );
      return;
    }

    // 2. Get payment mappings from invoice metadata
    const paymentMappings = this.extractPaymentMappings(invoice);

    if (!paymentMappings || paymentMappings.length === 0) {
      this.logService.warn(
        'No payment mappings found in invoice metadata',
        'InvoicePaidController',
        { invoiceId: invoice.id }
      );
      return;
    }

    // 3. Update each Root payment to successful
    await this.updateRootPayments(invoice.id, paymentMappings);

    this.logService.info(
      'Successfully processed invoice.paid event',
      'InvoicePaidController',
      {
        invoiceId: invoice.id,
        paymentsUpdated: paymentMappings.length,
      }
    );
  }

  /**
   * Extract payment mappings from invoice metadata
   */
  private extractPaymentMappings(
    invoice: Stripe.Invoice
  ): InvoicePaymentMapping[] | null {
    const metadata = invoice.metadata;

    if (!metadata?.associatedRootPaymentIds) {
      return null;
    }

    try {
      return JSON.parse(metadata.associatedRootPaymentIds);
    } catch (error: any) {
      this.logService.error(
        'Failed to parse payment mappings from invoice metadata',
        'InvoicePaidController',
        {
          invoiceId: invoice.id,
          error: error.message,
        }
      );
      return null;
    }
  }

  /**
   * Update all Root payments associated with the invoice
   */
  private async updateRootPayments(
    invoiceId: string,
    mappings: InvoicePaymentMapping[]
  ): Promise<void> {
    for (const mapping of mappings) {
      try {
        await this.rootService.updatePaymentStatus({
          paymentId: mapping.rootPaymentId,
          status: PaymentStatus.Successful,
        });

        this.logService.info(
          'Root payment updated to successful',
          'InvoicePaidController',
          {
            invoiceId,
            rootPaymentId: mapping.rootPaymentId,
            invoiceLineItemId: mapping.invoiceLineItemId,
          }
        );
      } catch (error: any) {
        this.logService.error(
          'Failed to update Root payment',
          'InvoicePaidController',
          {
            invoiceId,
            rootPaymentId: mapping.rootPaymentId,
            error: error.message,
          }
        );
        // Continue processing other payments even if one fails
      }
    }
  }
}
