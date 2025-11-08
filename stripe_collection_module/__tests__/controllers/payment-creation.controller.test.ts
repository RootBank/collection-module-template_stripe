/**
 * PaymentCreationController Tests
 */

import * as root from '@rootplatform/node-sdk';
import Stripe from 'stripe';
import { PaymentCreationController } from '../../code/controllers/root-event-processors/payment-creation.controller';
import {
  createMockLogService,
  createMockRootService,
  createMockStripeClient,
} from '../test-helpers';

describe('PaymentCreationController', () => {
  let controller: PaymentCreationController;
  let mockLogService: ReturnType<typeof createMockLogService>;
  let mockRootService: ReturnType<typeof createMockRootService>;
  let mockStripeClient: ReturnType<typeof createMockStripeClient>;
  let mockStripeSDK: any;

  beforeEach(() => {
    mockLogService = createMockLogService();
    mockRootService = createMockRootService();
    mockStripeClient = createMockStripeClient();
    mockStripeSDK = mockStripeClient.stripeSDK;

    controller = new PaymentCreationController(
      mockLogService as any,
      mockRootService as any,
      mockStripeClient as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    const validParams = {
      rootPaymentId: 'payment_123',
      rootPolicyId: 'policy_456',
      amount: 10000,
      description: 'Premium payment',
      status: root.PaymentStatus.Pending,
    };

    it('should successfully process valid payment creation', async () => {
      const mockPolicy = {
        policy_id: 'policy_456',
        currency: 'ZAR',
        app_data: {
          stripe_customer_id: 'cus_123',
        },
      } as any;

      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'requires_payment_method',
      } as Stripe.PaymentIntent;

      (mockRootService.getPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      (mockStripeSDK.paymentIntents.create as jest.Mock).mockResolvedValue(
        mockPaymentIntent
      );

      await controller.handle(validParams);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Processing payment creation event',
        'PaymentCreationController',
        {
          rootPaymentId: 'payment_123',
          rootPolicyId: 'policy_456',
          amount: 10000,
        }
      );

      expect(mockRootService.getPolicy).toHaveBeenCalledWith('policy_456');

      expect(mockStripeSDK.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000,
        currency: 'ZAR',
        customer: 'cus_123',
        description: 'Premium payment',
        metadata: {
          rootPaymentId: 'payment_123',
          rootPolicyId: 'policy_456',
        },
        payment_method_types: ['card'],
        confirm: true,
        off_session: true,
      });

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Successfully created Stripe payment intent',
        'PaymentCreationController',
        {
          rootPaymentId: 'payment_123',
          paymentIntentId: 'pi_123',
          status: 'requires_payment_method',
        }
      );
    });

    it('should skip payment with Stripe invoice description', async () => {
      const paramsWithInvoice = {
        ...validParams,
        description: 'Stripe created invoice item: inv_123',
      };

      await controller.handle(paramsWithInvoice);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Skipping payment - already has associated Stripe invoice',
        'PaymentCreationController',
        {
          rootPaymentId: 'payment_123',
          description: 'Stripe created invoice item: inv_123',
        }
      );

      expect(mockRootService.getPolicy).not.toHaveBeenCalled();
      expect(mockStripeSDK.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('should skip payment with refund description', async () => {
      const paramsWithRefund = {
        ...validParams,
        description: 'Refund for Stripe charge: ch_123',
      };

      await controller.handle(paramsWithRefund);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Skipping payment - already has associated Stripe invoice',
        'PaymentCreationController',
        {
          rootPaymentId: 'payment_123',
          description: 'Refund for Stripe charge: ch_123',
        }
      );

      expect(mockRootService.getPolicy).not.toHaveBeenCalled();
    });

    it('should skip non-pending payment', async () => {
      const paramsNotPending = {
        ...validParams,
        status: root.PaymentStatus.Successful,
      };

      await controller.handle(paramsNotPending);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Skipping payment - not in pending status',
        'PaymentCreationController',
        {
          rootPaymentId: 'payment_123',
          status: root.PaymentStatus.Successful,
        }
      );

      expect(mockRootService.getPolicy).not.toHaveBeenCalled();
    });

    it('should throw error if policy missing stripe_customer_id', async () => {
      const mockPolicy = {
        policy_id: 'policy_456',
        currency: 'ZAR',
        app_data: {},
      } as any;

      (mockRootService.getPolicy as jest.Mock).mockResolvedValue(mockPolicy);

      await expect(controller.handle(validParams)).rejects.toThrow(
        'Policy policy_456 is missing stripe_customer_id in app_data'
      );

      expect(mockRootService.getPolicy).toHaveBeenCalledWith('policy_456');
      expect(mockStripeSDK.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('should throw error if policy has no app_data', async () => {
      const mockPolicy = {
        policy_id: 'policy_456',
        currency: 'ZAR',
      } as any;

      (mockRootService.getPolicy as jest.Mock).mockResolvedValue(mockPolicy);

      await expect(controller.handle(validParams)).rejects.toThrow(
        'Policy policy_456 is missing stripe_customer_id in app_data'
      );
    });

    it('should handle Stripe payment intent creation failure', async () => {
      const mockPolicy = {
        policy_id: 'policy_456',
        currency: 'ZAR',
        app_data: {
          stripe_customer_id: 'cus_123',
        },
      } as any;

      const stripeError = new Error('Insufficient funds');

      (mockRootService.getPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      (mockStripeSDK.paymentIntents.create as jest.Mock).mockRejectedValue(
        stripeError
      );

      await expect(controller.handle(validParams)).rejects.toThrow(
        'Insufficient funds'
      );

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to create Stripe payment intent',
        'PaymentCreationController',
        {
          error: 'Insufficient funds',
          rootPaymentId: 'payment_123',
        }
      );
    });

    it('should handle policy retrieval failure', async () => {
      const error = new Error('Policy not found');

      (mockRootService.getPolicy as jest.Mock).mockRejectedValue(error);

      await expect(controller.handle(validParams)).rejects.toThrow(
        'Policy not found'
      );

      expect(mockRootService.getPolicy).toHaveBeenCalledWith('policy_456');
      expect(mockStripeSDK.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('should pass through policy currency to payment intent', async () => {
      const mockPolicy = {
        policy_id: 'policy_456',
        currency: 'USD',
        app_data: {
          stripe_customer_id: 'cus_123',
        },
      } as any;

      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded',
      } as Stripe.PaymentIntent;

      (mockRootService.getPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      (mockStripeSDK.paymentIntents.create as jest.Mock).mockResolvedValue(
        mockPaymentIntent
      );

      await controller.handle(validParams);

      expect(mockStripeSDK.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'USD',
        })
      );
    });

    it('should include metadata in payment intent', async () => {
      const mockPolicy = {
        policy_id: 'policy_456',
        currency: 'ZAR',
        app_data: {
          stripe_customer_id: 'cus_123',
        },
      } as any;

      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded',
      } as Stripe.PaymentIntent;

      (mockRootService.getPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      (mockStripeSDK.paymentIntents.create as jest.Mock).mockResolvedValue(
        mockPaymentIntent
      );

      await controller.handle(validParams);

      expect(mockStripeSDK.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            rootPaymentId: 'payment_123',
            rootPolicyId: 'policy_456',
          },
        })
      );
    });
  });
});
