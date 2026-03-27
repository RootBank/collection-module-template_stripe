/**
 * StripeService Tests
 */

import Stripe from 'stripe';
import { StripeService } from '../../code/services/stripe.service';
import {
  createMockLogService,
  createMockStripeClient,
} from '../test-helpers';

describe('StripeService', () => {
  let stripeService: StripeService;
  let mockLogService: ReturnType<typeof createMockLogService>;
  let mockStripeClient: ReturnType<typeof createMockStripeClient>;
  let mockStripeSDK: any;

  beforeEach(() => {
    mockLogService = createMockLogService();
    mockStripeClient = createMockStripeClient();
    mockStripeSDK = mockStripeClient.stripeSDK;

    stripeService = new StripeService(
      mockLogService as any,
      mockStripeClient as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('should create a Stripe customer successfully', async () => {
      const mockCustomer: Partial<Stripe.Customer> = {
        id: 'cus_123',
        email: 'test@example.com',
        name: 'John Doe',
      };

      (mockStripeSDK.customers.create as jest.Mock).mockResolvedValue(
        mockCustomer as Stripe.Customer
      );

      const params = {
        email: 'test@example.com',
        name: 'John Doe',
        metadata: { root_policy_id: 'policy_123' },
      };

      const result = await stripeService.createCustomer(params);

      expect(mockStripeSDK.customers.create).toHaveBeenCalledWith({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });
      expect(result).toEqual(mockCustomer);
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Creating Stripe customer',
        'StripeService',
        { email: params.email }
      );
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Stripe customer created successfully',
        'StripeService',
        { customerId: 'cus_123', email: 'test@example.com' }
      );
    });

    it('should handle errors when creating customer', async () => {
      const error = new Error('Stripe API error');
      (mockStripeSDK.customers.create as jest.Mock).mockRejectedValue(error);

      const params = {
        email: 'test@example.com',
      };

      await expect(stripeService.createCustomer(params)).rejects.toThrow(
        'Stripe API error'
      );

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to create Stripe customer: Stripe API error',
        'StripeService',
        { params, error }
      );
    });
  });

  describe('getCustomer', () => {
    it('should retrieve a Stripe customer successfully', async () => {
      const mockCustomer: Partial<Stripe.Customer> = {
        id: 'cus_123',
        email: 'test@example.com',
      };

      (mockStripeSDK.customers.retrieve as jest.Mock).mockResolvedValue(
        mockCustomer as Stripe.Customer
      );

      const result = await stripeService.getCustomer('cus_123');

      expect(mockStripeSDK.customers.retrieve).toHaveBeenCalledWith('cus_123');
      expect(result).toEqual(mockCustomer);
      expect(mockLogService.debug).toHaveBeenCalledWith(
        'Getting Stripe customer: cus_123',
        'StripeService'
      );
    });

    it('should throw error if customer is deleted', async () => {
      const mockCustomer = {
        id: 'cus_123',
        deleted: true,
      } as Stripe.DeletedCustomer;

      (mockStripeSDK.customers.retrieve as jest.Mock).mockResolvedValue(
        mockCustomer
      );

      await expect(stripeService.getCustomer('cus_123')).rejects.toThrow(
        'Customer cus_123 has been deleted'
      );
    });

    it('should handle errors when retrieving customer', async () => {
      const error = new Error('Customer not found');
      (mockStripeSDK.customers.retrieve as jest.Mock).mockRejectedValue(error);

      await expect(stripeService.getCustomer('cus_123')).rejects.toThrow(
        'Customer not found'
      );

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to get Stripe customer: Customer not found',
        'StripeService',
        { customerId: 'cus_123', error }
      );
    });
  });

  describe('updateCustomer', () => {
    it('should update a Stripe customer successfully', async () => {
      const mockCustomer: Partial<Stripe.Customer> = {
        id: 'cus_123',
        email: 'updated@example.com',
      };

      (mockStripeSDK.customers.update as jest.Mock).mockResolvedValue(
        mockCustomer as Stripe.Customer
      );

      const updateParams = {
        email: 'updated@example.com',
      };

      const result = await stripeService.updateCustomer(
        'cus_123',
        updateParams
      );

      expect(mockStripeSDK.customers.update).toHaveBeenCalledWith(
        'cus_123',
        updateParams
      );
      expect(result).toEqual(mockCustomer);
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Updating Stripe customer',
        'StripeService',
        { customerId: 'cus_123' }
      );
    });

    it('should handle errors when updating customer', async () => {
      const error = new Error('Update failed');
      (mockStripeSDK.customers.update as jest.Mock).mockRejectedValue(error);

      await expect(
        stripeService.updateCustomer('cus_123', { email: 'test@example.com' })
      ).rejects.toThrow('Update failed');

      expect(mockLogService.error).toHaveBeenCalled();
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_123',
        status: 'succeeded',
        amount: 10000,
        currency: 'zar',
      };

      (mockStripeSDK.paymentIntents.create as jest.Mock).mockResolvedValue(
        mockPaymentIntent as Stripe.PaymentIntent
      );

      const params = {
        amount: 10000,
        currency: 'zar',
        customerId: 'cus_123',
        description: 'Premium payment',
        metadata: { root_payment_id: 'payment_123' },
        confirm: true,
        offSession: true,
      };

      const result = await stripeService.createPaymentIntent(params);

      expect(mockStripeSDK.paymentIntents.create).toHaveBeenCalledWith({
        amount: params.amount,
        currency: params.currency,
        customer: params.customerId,
        description: params.description,
        metadata: params.metadata,
        payment_method_types: ['card'],
        confirm: params.confirm,
        off_session: params.offSession,
      });
      expect(result).toEqual(mockPaymentIntent);
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Creating Stripe payment intent',
        'StripeService',
        {
          amount: params.amount,
          currency: params.currency,
          customerId: params.customerId,
        }
      );
    });

    it('should handle errors when creating payment intent', async () => {
      const error = new Error('Insufficient funds');
      (mockStripeSDK.paymentIntents.create as jest.Mock).mockRejectedValue(
        error
      );

      const params = {
        amount: 10000,
        currency: 'zar',
        customerId: 'cus_123',
      };

      await expect(stripeService.createPaymentIntent(params)).rejects.toThrow(
        'Insufficient funds'
      );

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to create payment intent: Insufficient funds',
        'StripeService',
        { params, error }
      );
    });
  });

  describe('getPaymentMethod', () => {
    it('should retrieve a payment method successfully', async () => {
      const mockPaymentMethod: Partial<Stripe.PaymentMethod> = {
        id: 'pm_123',
        type: 'card',
      };

      (mockStripeSDK.paymentMethods.retrieve as jest.Mock).mockResolvedValue(
        mockPaymentMethod as Stripe.PaymentMethod
      );

      const result = await stripeService.getPaymentMethod('pm_123');

      expect(mockStripeSDK.paymentMethods.retrieve).toHaveBeenCalledWith(
        'pm_123'
      );
      expect(result).toEqual(mockPaymentMethod);
      expect(mockLogService.debug).toHaveBeenCalledWith(
        'Getting payment method: pm_123',
        'StripeService'
      );
    });

    it('should handle errors when retrieving payment method', async () => {
      const error = new Error('Payment method not found');
      (mockStripeSDK.paymentMethods.retrieve as jest.Mock).mockRejectedValue(
        error
      );

      await expect(stripeService.getPaymentMethod('pm_123')).rejects.toThrow(
        'Payment method not found'
      );

      expect(mockLogService.error).toHaveBeenCalled();
    });
  });

  describe('attachPaymentMethod', () => {
    it('should attach payment method to customer successfully', async () => {
      const mockPaymentMethod: Partial<Stripe.PaymentMethod> = {
        id: 'pm_123',
        customer: 'cus_123',
      };

      (mockStripeSDK.paymentMethods.attach as jest.Mock).mockResolvedValue(
        mockPaymentMethod as Stripe.PaymentMethod
      );

      const params = {
        paymentMethodId: 'pm_123',
        customerId: 'cus_123',
      };

      const result = await stripeService.attachPaymentMethod(params);

      expect(mockStripeSDK.paymentMethods.attach).toHaveBeenCalledWith(
        'pm_123',
        { customer: 'cus_123' }
      );
      expect(result).toEqual(mockPaymentMethod);
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Attaching payment method',
        'StripeService',
        params
      );
    });

    it('should handle errors when attaching payment method', async () => {
      const error = new Error('Already attached');
      (mockStripeSDK.paymentMethods.attach as jest.Mock).mockRejectedValue(
        error
      );

      const params = {
        paymentMethodId: 'pm_123',
        customerId: 'cus_123',
      };

      await expect(stripeService.attachPaymentMethod(params)).rejects.toThrow(
        'Already attached'
      );

      expect(mockLogService.error).toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription successfully', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        status: 'canceled',
      };

      (mockStripeSDK.subscriptions.cancel as jest.Mock).mockResolvedValue(
        mockSubscription as Stripe.Subscription
      );

      const result = await stripeService.cancelSubscription('sub_123');

      expect(mockStripeSDK.subscriptions.cancel).toHaveBeenCalledWith(
        'sub_123'
      );
      expect(result).toEqual(mockSubscription);
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Canceling Stripe subscription',
        'StripeService',
        { subscriptionId: 'sub_123' }
      );
    });

    it('should handle errors when canceling subscription', async () => {
      const error = new Error('Subscription not found');
      (mockStripeSDK.subscriptions.cancel as jest.Mock).mockRejectedValue(
        error
      );

      await expect(stripeService.cancelSubscription('sub_123')).rejects.toThrow(
        'Subscription not found'
      );

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Failed to cancel subscription: Subscription not found',
        'StripeService',
        { subscriptionId: 'sub_123', error }
      );
    });
  });
});
