/**
 * StripeToRootAdapter Tests
 */

import Stripe from 'stripe';
import * as root from '@rootplatform/node-sdk';
import StripeToRootAdapter from '../../code/adapters/stripe-to-root-adapter';

describe('StripeToRootAdapter', () => {
  let adapter: StripeToRootAdapter;

  beforeEach(() => {
    adapter = new StripeToRootAdapter();
  });

  describe('convertInvoiceToRootPayment', () => {
    it('should convert invoice with successful status', () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 10000,
      } as any;

      const result = adapter.convertInvoiceToRootPayment(mockInvoice, {
        status: root.PaymentStatus.Successful,
      });

      expect(result).toEqual({
        status: root.PaymentStatus.Successful,
        failure_reason: undefined,
        failure_action: root.FailureAction.BlockRetry,
      });
    });

    it('should convert invoice with failed status and custom failure reason', () => {
      const mockInvoice = {
        id: 'inv_123',
      } as any;

      const result = adapter.convertInvoiceToRootPayment(mockInvoice, {
        status: root.PaymentStatus.Failed,
        failureReason: 'Card declined',
        failureAction: root.FailureAction.AllowRetry,
      });

      expect(result).toEqual({
        status: root.PaymentStatus.Failed,
        failure_reason: 'Card declined',
        failure_action: root.FailureAction.AllowRetry,
      });
    });

    it('should use invoice last_finalization_error when no failure reason provided', () => {
      const mockInvoice = {
        id: 'inv_123',
        last_finalization_error: {
          message: 'Payment failed due to insufficient funds',
        },
      } as any;

      const result = adapter.convertInvoiceToRootPayment(mockInvoice, {
        status: root.PaymentStatus.Failed,
      });

      expect(result).toEqual({
        status: root.PaymentStatus.Failed,
        failure_reason: 'Payment failed due to insufficient funds',
        failure_action: root.FailureAction.BlockRetry,
      });
    });

    it('should handle invoice with no error information', () => {
      const mockInvoice = {
        id: 'inv_123',
      } as any;

      const result = adapter.convertInvoiceToRootPayment(mockInvoice, {
        status: root.PaymentStatus.Pending,
      });

      expect(result).toEqual({
        status: root.PaymentStatus.Pending,
        failure_reason: undefined,
        failure_action: root.FailureAction.BlockRetry,
      });
    });

    it('should prioritize provided failure reason over invoice error', () => {
      const mockInvoice = {
        id: 'inv_123',
        last_finalization_error: {
          message: 'Invoice error message',
        },
      } as any;

      const result = adapter.convertInvoiceToRootPayment(mockInvoice, {
        status: root.PaymentStatus.Failed,
        failureReason: 'Custom error message',
      });

      expect(result.failure_reason).toBe('Custom error message');
    });
  });

  describe('convertCustomerToAppData', () => {
    it('should convert customer with all fields', () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
        invoice_settings: {
          default_payment_method: 'pm_123',
        },
        created: 1640995200, // 2022-01-01 00:00:00 UTC
      } as any;

      const result = adapter.convertCustomerToAppData(mockCustomer);

      expect(result).toEqual({
        stripe_customer_id: 'cus_123',
        stripe_email: 'test@example.com',
        stripe_default_payment_method: 'pm_123',
        stripe_created_at: '2022-01-01T00:00:00.000Z',
      });
    });

    it('should handle customer with null email', () => {
      const mockCustomer = {
        id: 'cus_123',
        email: null,
        invoice_settings: {
          default_payment_method: null,
        },
        created: 1640995200,
      } as any;

      const result = adapter.convertCustomerToAppData(mockCustomer);

      expect(result).toEqual({
        stripe_customer_id: 'cus_123',
        stripe_email: null,
        stripe_default_payment_method: null,
        stripe_created_at: '2022-01-01T00:00:00.000Z',
      });
    });

    it('should handle customer with no default payment method', () => {
      const mockCustomer = {
        id: 'cus_456',
        email: 'user@example.com',
        invoice_settings: {
          default_payment_method: null,
        },
        created: 1672531200, // 2023-01-01 00:00:00 UTC
      } as any;

      const result = adapter.convertCustomerToAppData(mockCustomer);

      expect(result.stripe_default_payment_method).toBeNull();
      expect(result.stripe_created_at).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should correctly convert Unix timestamp to ISO string', () => {
      const mockCustomer = {
        id: 'cus_789',
        email: 'test@test.com',
        invoice_settings: {},
        created: 0, // Epoch
      } as any;

      const result = adapter.convertCustomerToAppData(mockCustomer);

      expect(result.stripe_created_at).toBe('1970-01-01T00:00:00.000Z');
    });
  });
});
