/**
 * InvoicePaidController Tests
 */

import Stripe from 'stripe';
import { PaymentStatus } from '@rootplatform/node-sdk';
import { InvoicePaidController } from '../../code/controllers/stripe-event-processors/invoice-paid.controller';
import {
  createMockLogService,
  createMockRootService,
  createMockStripeClient,
} from '../test-helpers';

describe('InvoicePaidController', () => {
  let controller: InvoicePaidController;
  let mockLogService: ReturnType<typeof createMockLogService>;
  let mockRootService: ReturnType<typeof createMockRootService>;
  let mockStripeClient: ReturnType<typeof createMockStripeClient>;

  beforeEach(() => {
    mockLogService = createMockLogService();
    mockRootService = createMockRootService();
    mockStripeClient = createMockStripeClient();

    controller = new InvoicePaidController(
      mockLogService as any,
      mockRootService as any,
      mockStripeClient as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should successfully process invoice with payment mappings', async () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 10000,
        amount_due: 10000,
        metadata: {
          associatedRootPaymentIds: JSON.stringify([
            {
              rootPaymentId: 'payment_123',
              invoiceLineItemId: 'il_123',
            },
          ]),
        },
      } as any;

      (mockRootService.updatePaymentStatus as jest.Mock).mockResolvedValue(
        undefined
      );

      await controller.handle(mockInvoice);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Processing invoice.paid event',
        'InvoicePaidController',
        {
          invoiceId: 'inv_123',
          amount: 10000,
        }
      );

      expect(mockRootService.updatePaymentStatus).toHaveBeenCalledWith({
        paymentId: 'payment_123',
        status: PaymentStatus.Successful,
      });

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Root payment updated to successful',
        'InvoicePaidController',
        {
          invoiceId: 'inv_123',
          rootPaymentId: 'payment_123',
          invoiceLineItemId: 'il_123',
        }
      );

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Successfully processed invoice.paid event',
        'InvoicePaidController',
        {
          invoiceId: 'inv_123',
          paymentsUpdated: 1,
        }
      );
    });

    it('should process multiple payment mappings', async () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 20000,
        amount_due: 20000,
        metadata: {
          associatedRootPaymentIds: JSON.stringify([
            {
              rootPaymentId: 'payment_123',
              invoiceLineItemId: 'il_123',
            },
            {
              rootPaymentId: 'payment_456',
              invoiceLineItemId: 'il_456',
            },
          ]),
        },
      } as any;

      (mockRootService.updatePaymentStatus as jest.Mock).mockResolvedValue(
        undefined
      );

      await controller.handle(mockInvoice);

      expect(mockRootService.updatePaymentStatus).toHaveBeenCalledTimes(2);
      expect(mockRootService.updatePaymentStatus).toHaveBeenCalledWith({
        paymentId: 'payment_123',
        status: PaymentStatus.Successful,
      });
      expect(mockRootService.updatePaymentStatus).toHaveBeenCalledWith({
        paymentId: 'payment_456',
        status: PaymentStatus.Successful,
      });

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Successfully processed invoice.paid event',
        'InvoicePaidController',
        {
          invoiceId: 'inv_123',
          paymentsUpdated: 2,
        }
      );
    });

    it('should skip invoice with zero amount_due', async () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 0,
        amount_due: 0,
        metadata: {},
      } as any;

      await controller.handle(mockInvoice);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Invoice has zero amount_due, skipping (already processed on invoice.created)',
        'InvoicePaidController',
        { invoiceId: 'inv_123' }
      );

      expect(mockRootService.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('should warn when no payment mappings found', async () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 10000,
        amount_due: 10000,
        metadata: {},
      } as any;

      await controller.handle(mockInvoice);

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'No payment mappings found in invoice metadata',
        'InvoicePaidController',
        { invoiceId: 'inv_123' }
      );

      expect(mockRootService.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('should warn when metadata is missing associatedRootPaymentIds', async () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 10000,
        amount_due: 10000,
        metadata: {
          someOtherField: 'value',
        },
      } as any;

      await controller.handle(mockInvoice);

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'No payment mappings found in invoice metadata',
        'InvoicePaidController',
        { invoiceId: 'inv_123' }
      );
    });

    it('should handle invalid JSON in payment mappings', async () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 10000,
        amount_due: 10000,
        metadata: {
          associatedRootPaymentIds: 'invalid json {',
        },
      } as any;

      await controller.handle(mockInvoice);

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to parse payment mappings from invoice metadata',
        'InvoicePaidController',
        expect.objectContaining({
          invoiceId: 'inv_123',
        })
      );

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'No payment mappings found in invoice metadata',
        'InvoicePaidController',
        { invoiceId: 'inv_123' }
      );

      expect(mockRootService.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('should continue processing other payments if one fails', async () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 20000,
        amount_due: 20000,
        metadata: {
          associatedRootPaymentIds: JSON.stringify([
            {
              rootPaymentId: 'payment_123',
              invoiceLineItemId: 'il_123',
            },
            {
              rootPaymentId: 'payment_456',
              invoiceLineItemId: 'il_456',
            },
          ]),
        },
      } as any;

      const error = new Error('Payment update failed');
      (mockRootService.updatePaymentStatus as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);

      await controller.handle(mockInvoice);

      expect(mockRootService.updatePaymentStatus).toHaveBeenCalledTimes(2);

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to update Root payment',
        'InvoicePaidController',
        {
          invoiceId: 'inv_123',
          rootPaymentId: 'payment_123',
          error: 'Payment update failed',
        }
      );

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Root payment updated to successful',
        'InvoicePaidController',
        {
          invoiceId: 'inv_123',
          rootPaymentId: 'payment_456',
          invoiceLineItemId: 'il_456',
        }
      );
    });

    it('should handle empty payment mappings array', async () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 10000,
        amount_due: 10000,
        metadata: {
          associatedRootPaymentIds: JSON.stringify([]),
        },
      } as any;

      await controller.handle(mockInvoice);

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'No payment mappings found in invoice metadata',
        'InvoicePaidController',
        { invoiceId: 'inv_123' }
      );

      expect(mockRootService.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('should handle all payments failing', async () => {
      const mockInvoice = {
        id: 'inv_123',
        amount_paid: 10000,
        amount_due: 10000,
        metadata: {
          associatedRootPaymentIds: JSON.stringify([
            {
              rootPaymentId: 'payment_123',
              invoiceLineItemId: 'il_123',
            },
          ]),
        },
      } as any;

      const error = new Error('Payment update failed');
      (mockRootService.updatePaymentStatus as jest.Mock).mockRejectedValue(
        error
      );

      await controller.handle(mockInvoice);

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to update Root payment',
        'InvoicePaidController',
        {
          invoiceId: 'inv_123',
          rootPaymentId: 'payment_123',
          error: 'Payment update failed',
        }
      );

      // Should still log final success message even if individual payments failed
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Successfully processed invoice.paid event',
        'InvoicePaidController',
        {
          invoiceId: 'inv_123',
          paymentsUpdated: 1,
        }
      );
    });
  });
});
