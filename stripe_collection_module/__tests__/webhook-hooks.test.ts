/**
 * Webhook Hooks Tests
 *
 * Tests for the Stripe webhook handler
 */

import * as crypto from 'crypto';
import { processWebhookRequest } from '../code/webhook-hooks';
import { getContainer } from '../code/core/container.setup';
import { ServiceToken } from '../code/core/container';
import { StripeEvents } from '../code/interfaces/stripe-events';
import { createMockLogService } from './test-helpers';

// Mock dependencies
jest.mock('../code/core/container.setup');
jest.mock('../code/services/config-instance', () => ({
  getConfigService: jest.fn(() => ({
    get: jest.fn((key: string) => {
      if (key === 'stripeWebhookSigningSecret') return 'whsec_test_secret';
      return null;
    }),
  })),
}));

const { getConfigService } = require('../code/services/config-instance');

describe('Webhook Hooks', () => {
  let mockContainer: any;
  let mockLogService: ReturnType<typeof createMockLogService>;
  let mockInvoicePaidController: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogService = createMockLogService();
    mockInvoicePaidController = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    mockContainer = {
      resolve: jest.fn((token: symbol) => {
        if (token === ServiceToken.LOG_SERVICE) return mockLogService;
        if (token === ServiceToken.INVOICE_PAID_CONTROLLER)
          return mockInvoicePaidController;
        return null;
      }),
    };

    (getContainer as jest.Mock).mockReturnValue(mockContainer);

    // Reset config mock to return fresh instance each time
    (getConfigService as jest.Mock).mockReturnValue({
      get: jest.fn((key: string) => {
        if (key === 'stripeWebhookSigningSecret') return 'whsec_test_secret';
        return null;
      }),
    });
  });

  describe('processWebhookRequest', () => {
    const createValidSignature = (body: string, timestamp: number): string => {
      const webhookSecret = 'whsec_test_secret';
      const signedPayload = `${timestamp}.${body}`;
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload)
        .digest('hex');
      return `t=${timestamp},v1=${signature}`;
    };

    const createWebhookRequest = (
      event: any,
      signature?: string
    ): any => {
      const body = JSON.stringify(event);
      const timestamp = Math.floor(Date.now() / 1000);
      const validSignature = signature || createValidSignature(body, timestamp);

      return {
        request: {
          headers: {
            'stripe-signature': validSignature,
          },
          body: Buffer.from(body),
        },
      };
    };

    describe('Signature Verification', () => {
      it('should reject request with missing signature', async () => {
        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: { object: { id: 'in_test' } },
        };

        const request = {
          request: {
            headers: {},
            body: Buffer.from(JSON.stringify(event)),
          },
        };

        const result = await processWebhookRequest(request);

        expect(result.response.status).toBe(403);
        expect(JSON.parse(result.response.body)).toEqual({
          error: 'Invalid signature',
        });
        expect(mockLogService.warn).toHaveBeenCalledWith(
          'Webhook signature verification failed',
          'WebhookHandler'
        );
      });

      it('should reject request with invalid signature format', async () => {
        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: { object: { id: 'in_test' } },
        };

        const request = {
          request: {
            headers: {
              'stripe-signature': 'invalid_signature',
            },
            body: Buffer.from(JSON.stringify(event)),
          },
        };

        const result = await processWebhookRequest(request);

        expect(result.response.status).toBe(403);
        expect(JSON.parse(result.response.body)).toEqual({
          error: 'Invalid signature',
        });
      });

      it('should reject request with mismatched signature', async () => {
        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: { object: { id: 'in_test' } },
        };

        const request = createWebhookRequest(event, 't=123456789,v1=wrongsig');

        const result = await processWebhookRequest(request);

        expect(result.response.status).toBe(403);
        expect(JSON.parse(result.response.body)).toEqual({
          error: 'Invalid signature',
        });
      });

      it('should accept request with valid signature', async () => {
        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: {
            object: {
              id: 'in_test',
              amount_due: 1000,
              metadata: {},
            },
          },
        };

        const request = createWebhookRequest(event);
        const result = await processWebhookRequest(request);

        expect(result.response.status).toBe(200);
        expect(JSON.parse(result.response.body)).toEqual({ received: true });
      });
    });

    describe('Event Routing', () => {
      it('should route invoice.paid events to InvoicePaidController', async () => {
        const invoice = {
          id: 'in_test123',
          amount_due: 5000,
          currency: 'usd',
          metadata: {
            payment_mappings: JSON.stringify([
              { policy_id: 'pol_123', payment_id: 'pay_123' },
            ]),
          },
        };

        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: { object: invoice },
        };

        const request = createWebhookRequest(event);
        const result = await processWebhookRequest(request);

        expect(mockLogService.info).toHaveBeenCalledWith(
          'Received Stripe webhook',
          'WebhookHandler',
          {
            eventType: StripeEvents.InvoicePaid,
            eventId: 'evt_test',
          }
        );
        expect(mockInvoicePaidController.handle).toHaveBeenCalledWith(invoice);
        expect(result.response.status).toBe(200);
        expect(JSON.parse(result.response.body)).toEqual({ received: true });
      });

      it('should log warning for unhandled event types', async () => {
        const event = {
          id: 'evt_test',
          type: 'customer.created',
          data: { object: { id: 'cus_test' } },
        };

        const request = createWebhookRequest(event);
        const result = await processWebhookRequest(request);

        expect(mockLogService.warn).toHaveBeenCalledWith(
          'Unhandled Stripe event type',
          'WebhookHandler',
          {
            eventType: 'customer.created',
          }
        );
        expect(result.response.status).toBe(200);
        expect(JSON.parse(result.response.body)).toEqual({ received: true });
      });
    });

    describe('Error Handling', () => {
      it('should handle controller errors gracefully', async () => {
        mockInvoicePaidController.handle.mockRejectedValue(
          new Error('Controller processing failed')
        );

        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: {
            object: {
              id: 'in_test',
              amount_due: 1000,
              metadata: {},
            },
          },
        };

        const request = createWebhookRequest(event);
        const result = await processWebhookRequest(request);

        expect(mockLogService.error).toHaveBeenCalledWith(
          'Error processing webhook',
          'WebhookHandler',
          {
            error: 'Controller processing failed',
          }
        );
        expect(result.response.status).toBe(500);
        expect(JSON.parse(result.response.body)).toEqual({
          error: 'Internal server error',
        });
      });

      it('should handle JSON parsing errors', async () => {
        const request = {
          request: {
            headers: {
              'stripe-signature': 't=123456789,v1=abcdef',
            },
            body: Buffer.from('invalid json'),
          },
        };

        // Need to create a valid signature for invalid JSON
        const timestamp = 123456789;
        const webhookSecret = 'whsec_test_secret';
        const signedPayload = `${timestamp}.invalid json`;
        const signature = crypto
          .createHmac('sha256', webhookSecret)
          .update(signedPayload)
          .digest('hex');

        request.request.headers['stripe-signature'] = `t=${timestamp},v1=${signature}`;

        const result = await processWebhookRequest(request);

        expect(mockLogService.error).toHaveBeenCalledWith(
          'Error processing webhook',
          'WebhookHandler',
          expect.objectContaining({
            error: expect.stringContaining('JSON'),
          })
        );
        expect(result.response.status).toBe(500);
      });

      it('should handle non-Error objects thrown', async () => {
        mockInvoicePaidController.handle.mockRejectedValue('String error');

        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: {
            object: {
              id: 'in_test',
              amount_due: 1000,
              metadata: {},
            },
          },
        };

        const request = createWebhookRequest(event);
        const result = await processWebhookRequest(request);

        expect(result.response.status).toBe(500);
        expect(JSON.parse(result.response.body)).toEqual({
          error: 'Internal server error',
        });
      });
    });

    describe('Response Format', () => {
      it('should return proper response headers for success', async () => {
        const event = {
          id: 'evt_test',
          type: 'customer.created',
          data: { object: { id: 'cus_test' } },
        };

        const request = createWebhookRequest(event);
        const result = await processWebhookRequest(request);

        expect(result.response).toEqual({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ received: true }),
        });
      });

      it('should return proper response headers for signature failure', async () => {
        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: { object: { id: 'in_test' } },
        };

        const request = {
          request: {
            headers: {},
            body: Buffer.from(JSON.stringify(event)),
          },
        };

        const result = await processWebhookRequest(request);

        expect(result.response).toEqual({
          status: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid signature' }),
        });
      });

      it('should return proper response headers for errors', async () => {
        mockInvoicePaidController.handle.mockRejectedValue(new Error('Test'));

        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: {
            object: {
              id: 'in_test',
              amount_due: 1000,
              metadata: {},
            },
          },
        };

        const request = createWebhookRequest(event);
        const result = await processWebhookRequest(request);

        expect(result.response).toEqual({
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });
    });

    describe('Signature Parsing Edge Cases', () => {
      it('should handle signature with multiple v1 values (use last)', async () => {
        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: {
            object: {
              id: 'in_test',
              amount_due: 1000,
              metadata: {},
            },
          },
        };

        const body = JSON.stringify(event);
        const timestamp = Math.floor(Date.now() / 1000);
        const webhookSecret = 'whsec_test_secret';
        const signedPayload = `${timestamp}.${body}`;
        const validSig = crypto
          .createHmac('sha256', webhookSecret)
          .update(signedPayload)
          .digest('hex');

        // The signature parsing overwrites with the last v1 value
        // So put the valid signature last
        const request = {
          request: {
            headers: {
              'stripe-signature': `t=${timestamp},v1=wrongsig,v1=${validSig}`,
            },
            body: Buffer.from(body),
          },
        };

        const result = await processWebhookRequest(request);

        expect(result.response.status).toBe(200);
      });

      it('should reject signature with missing timestamp', async () => {
        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: { object: { id: 'in_test' } },
        };

        const request = {
          request: {
            headers: {
              'stripe-signature': 'v1=somesignature',
            },
            body: Buffer.from(JSON.stringify(event)),
          },
        };

        const result = await processWebhookRequest(request);

        expect(result.response.status).toBe(403);
      });

      it('should reject signature with missing v1', async () => {
        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: { object: { id: 'in_test' } },
        };

        const request = {
          request: {
            headers: {
              'stripe-signature': 't=123456789',
            },
            body: Buffer.from(JSON.stringify(event)),
          },
        };

        const result = await processWebhookRequest(request);

        expect(result.response.status).toBe(403);
      });

      it('should handle signature comparison with different lengths gracefully', async () => {
        const event = {
          id: 'evt_test',
          type: StripeEvents.InvoicePaid,
          data: { object: { id: 'in_test' } },
        };

        const request = {
          request: {
            headers: {
              'stripe-signature': 't=123456789,v1=short',
            },
            body: Buffer.from(JSON.stringify(event)),
          },
        };

        const result = await processWebhookRequest(request);

        expect(result.response.status).toBe(403);
      });
    });
  });
});

