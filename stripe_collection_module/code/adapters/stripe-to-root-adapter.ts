import { PaymentStatus, RootPaymentType } from '../interfaces';

export default class StripeToRootAdapter {
  convertInvoiceToUpdatedRootPayment(
    invoice: any,
    rootPaymentId: string,
    paymentStatus: PaymentStatus,
  ) {
    const rootPayment = {
      status: paymentStatus,
      failure_reason: invoice.last_finalization_error?.message,
      failure_action: 'BlockRetry',
      payment_id: rootPaymentId,
    };
    return rootPayment;
  }

  convertChargeRefundToRootPayment({
    paymentStatus,
    amount,
    description,
    paymentDate,
    externalReference,
    finalizedAt,
    paymentMethodId,
  }: any) {
    const rootPayment = {
      status: paymentStatus,
      amount: -1 * amount, // refund amounts should be negative on Root
      description,
      payment_date: paymentDate,
      external_reference: externalReference,
      payment_type: RootPaymentType.PremiumRefund,
      finalized_at: finalizedAt,
      payment_method_id: paymentMethodId,
    };

    return rootPayment;
  }
}
