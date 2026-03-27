/**
 * StripeToRootAdapter - Data transformation layer between Stripe and Root
 *
 * This adapter is responsible for converting Stripe data structures to Root Platform
 * data structures. Use this when you need to transform webhook payloads or API responses
 * from Stripe before sending them to Root.
 *
 * ## When to Use
 *
 * - Converting Stripe invoice objects to Root payment objects
 * - Transforming Stripe customer data to Root policyholder data
 * - Mapping Stripe subscription data to Root policy billing data
 * - Converting Stripe payment method details to Root payment method format
 *
 * ## Example Usage
 *
 * ```typescript
 * import StripeToRootAdapter from './adapters/stripe-to-root-adapter';
 * import { PaymentStatus } from '@rootplatform/node-sdk';
 *
 * const adapter = new StripeToRootAdapter();
 *
 * // Example 1: Convert Stripe invoice to Root payment update
 * async function handleInvoicePaid(stripeInvoice: Stripe.Invoice) {
 *   const rootPaymentUpdate = adapter.convertInvoiceToRootPayment(stripeInvoice, {
 *     status: PaymentStatus.Successful,
 *   });
 *
 *   await rootClient.updatePayment(rootPaymentUpdate);
 * }
 *
 * // Example 2: Convert Stripe customer to Root app_data
 * async function handleCustomerCreated(stripeCustomer: Stripe.Customer) {
 *   const appData = adapter.convertCustomerToAppData(stripeCustomer);
 *
 *   await rootClient.updatePolicy({
 *     policyId: policy.policy_id,
 *     app_data: appData,
 *   });
 * }
 * ```
 */

import Stripe from 'stripe';
import * as root from '@rootplatform/node-sdk';

export interface ConvertInvoiceParams {
  status: root.PaymentStatus;
  failureReason?: string;
  failureAction?: root.FailureAction;
}

export default class StripeToRootAdapter {
  /**
   * Convert Stripe invoice to Root payment update parameters
   *
   * Use this when processing invoice.paid or invoice.payment_failed webhooks
   * to update the corresponding Root payment status.
   *
   * @param invoice - Stripe invoice object from webhook
   * @param params - Payment status parameters
   * @returns Root payment update object
   *
   * @example
   * ```typescript
   * const adapter = new StripeToRootAdapter();
   * const paymentUpdate = adapter.convertInvoiceToRootPayment(invoice, {
   *   status: PaymentStatus.Successful,
   * });
   * ```
   */
  convertInvoiceToRootPayment(
    invoice: Stripe.Invoice,
    params: ConvertInvoiceParams
  ) {
    return {
      status: params.status,
      failure_reason:
        params.failureReason || invoice.last_finalization_error?.message,
      failure_action: params.failureAction || root.FailureAction.BlockRetry,
    };
  }

  /**
   * Convert Stripe customer to Root policy app_data
   *
   * Use this to store Stripe customer information in Root policy app_data
   * for easy reference and lookup.
   *
   * @param customer - Stripe customer object
   * @returns Object suitable for Root policy app_data
   *
   * @example
   * ```typescript
   * const adapter = new StripeToRootAdapter();
   * const appData = adapter.convertCustomerToAppData(stripeCustomer);
   *
   * await rootClient.SDK.updatePolicy({
   *   policyId,
   *   body: { app_data: appData },
   * });
   * ```
   */
  convertCustomerToAppData(customer: Stripe.Customer) {
    return {
      stripe_customer_id: customer.id,
      stripe_email: customer.email,
      stripe_default_payment_method:
        customer.invoice_settings.default_payment_method,
      stripe_created_at: new Date(customer.created * 1000).toISOString(),
    };
  }
}
