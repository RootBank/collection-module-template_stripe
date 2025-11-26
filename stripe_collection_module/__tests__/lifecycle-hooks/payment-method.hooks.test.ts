/**
 * Payment Method Hooks Tests
 */

import * as paymentMethodHooks from '../../code/lifecycle-hooks/payment-method.hooks';
import { getContainer } from '../../code/core/container.setup';
import { ServiceToken } from '../../code/core/container';
import {
  createMockLogService,
  createMockStripeClient,
  createMockConfigService,
} from '../test-helpers';

jest.mock('../../code/core/container.setup');

describe('Payment Method Hooks', () => {
  let mockContainer: any;
  let mockLogService: ReturnType<typeof createMockLogService>;
  let mockStripeClient: ReturnType<typeof createMockStripeClient>;
  let mockConfigService: ReturnType<typeof createMockConfigService>;
  let mockRenderService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogService = createMockLogService();
    mockStripeClient = createMockStripeClient();
    mockConfigService = createMockConfigService();

    mockRenderService = {
      renderCreatePaymentMethod: jest.fn(),
      renderViewPaymentMethodSummary: jest.fn(),
    };

    mockContainer = {
      resolve: jest.fn((token: symbol) => {
        if (token === ServiceToken.LOG_SERVICE) return mockLogService;
        if (token === ServiceToken.STRIPE_CLIENT) return mockStripeClient;
        if (token === ServiceToken.CONFIG_SERVICE) return mockConfigService;
        if (token === ServiceToken.RENDER_SERVICE) return mockRenderService;
        return null;
      }),
    };

    (getContainer as jest.Mock).mockReturnValue(mockContainer);
  });

  describe('createPaymentMethod', () => {
    it('should return module data with setup intent', () => {
      const setupIntent = {
        id: 'seti_123',
        usage: 'off_session',
        object: 'setup_intent',
        status: 'succeeded',
        livemode: false,
        payment_method: 'pm_123',
      };

      const result = paymentMethodHooks.createPaymentMethod({
        data: { setupIntent },
      });

      expect(result).toEqual({
        module: {
          id: 'seti_123',
          usage: 'off_session',
          object: 'setup_intent',
          status: 'succeeded',
          livemode: false,
          payment_method: 'pm_123',
        },
      });
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Creating payment method',
        'createPaymentMethod',
        { setupIntent }
      );
    });

    it('should return module data without setup intent', () => {
      const data = { customField: 'value' };

      const result = paymentMethodHooks.createPaymentMethod({
        data: data as any,
      });

      expect(result).toEqual({
        module: data,
      });
    });

    it('should handle empty data', () => {
      const result = paymentMethodHooks.createPaymentMethod({});

      expect(result).toEqual({
        module: undefined,
      });
    });
  });

  describe('renderCreatePaymentMethod', () => {
    it('should render payment method creation form', async () => {
      (
        mockStripeClient.stripeSDK.setupIntents.create as jest.Mock
      ).mockResolvedValue({
        client_secret: 'seti_123_secret_456',
      });
      mockRenderService.renderCreatePaymentMethod.mockReturnValue(
        '<form>Payment Form</form>'
      );

      const result = await paymentMethodHooks.renderCreatePaymentMethod();

      expect(mockStripeClient.stripeSDK.setupIntents.create).toHaveBeenCalledWith(
        {}
      );
      expect(mockRenderService.renderCreatePaymentMethod).toHaveBeenCalledWith({
        stripePublishableKey: 'pk_test_123',
        setupIntentClientSecret: 'seti_123_secret_456',
      });
      expect(result).toBe('<form>Payment Form</form>');
    });

    it('should throw error if client secret is missing', async () => {
      (
        mockStripeClient.stripeSDK.setupIntents.create as jest.Mock
      ).mockResolvedValue({
        client_secret: null,
      });

      await expect(
        paymentMethodHooks.renderCreatePaymentMethod()
      ).rejects.toThrow('Setup intent client secret is missing');

      expect(mockLogService.error).toHaveBeenCalled();
    });

    it('should handle setup intent creation error', async () => {
      (
        mockStripeClient.stripeSDK.setupIntents.create as jest.Mock
      ).mockRejectedValue(new Error('Stripe API error'));

      await expect(
        paymentMethodHooks.renderCreatePaymentMethod()
      ).rejects.toThrow('Error creating setup intent: Stripe API error');

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Error rendering payment method form',
        'renderCreatePaymentMethod',
        {},
        expect.any(Error)
      );
    });
  });

  describe('renderViewPaymentMethodSummary', () => {
    it('should render payment method summary', async () => {
      const mockPaymentMethod = {
        id: 'pm_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
        },
      };

      (
        mockStripeClient.stripeSDK.paymentMethods.retrieve as jest.Mock
      ).mockResolvedValue(mockPaymentMethod);
      mockRenderService.renderViewPaymentMethodSummary.mockReturnValue(
        '<span>Visa ****4242</span>'
      );

      const result = await paymentMethodHooks.renderViewPaymentMethodSummary({
        payment_method: 'pm_123',
      });

      expect(
        mockStripeClient.stripeSDK.paymentMethods.retrieve
      ).toHaveBeenCalledWith('pm_123');
      expect(
        mockRenderService.renderViewPaymentMethodSummary
      ).toHaveBeenCalledWith({
        payment_method: {
          module: {
            payment_method: 'pm_123',
          },
        },
      });
      expect(result).toBe('<span>Visa ****4242</span>');
    });

    it('should return error message if payment method ID is missing', async () => {
      const result = await paymentMethodHooks.renderViewPaymentMethodSummary({
        payment_method: null,
      });

      expect(result).toContain('No payment method found');
      expect(
        mockStripeClient.stripeSDK.paymentMethods.retrieve
      ).not.toHaveBeenCalled();
    });

    it('should handle payment method retrieval error', async () => {
      (
        mockStripeClient.stripeSDK.paymentMethods.retrieve as jest.Mock
      ).mockRejectedValue(new Error('Not found'));

      await expect(
        paymentMethodHooks.renderViewPaymentMethodSummary({
          payment_method: 'pm_invalid',
        })
      ).rejects.toThrow('Error retrieving payment method: Not found');

      expect(mockLogService.error).toHaveBeenCalled();
    });
  });

  describe('renderViewPaymentMethod', () => {
    it('should return empty string (stub implementation)', () => {
      const result = paymentMethodHooks.renderViewPaymentMethod();

      expect(result).toBe('');
    });
  });

  describe('afterPolicyPaymentMethodAssigned', () => {
    it('should log payment method assignment', () => {
      const policy = { policy_id: 'policy_123' };

      paymentMethodHooks.afterPolicyPaymentMethodAssigned({ policy });

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Payment method assigned to policy',
        'afterPolicyPaymentMethodAssigned',
        { policyId: 'policy_123' }
      );
    });
  });

  describe('afterPaymentMethodRemoved', () => {
    it('should log payment method removal', () => {
      const policy = { policy_id: 'policy_456' };

      paymentMethodHooks.afterPaymentMethodRemoved({ policy });

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Payment method removed from policy',
        'afterPaymentMethodRemoved',
        { policyId: 'policy_456' }
      );
    });
  });
});
