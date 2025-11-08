/**
 * RenderService Tests
 */

import { RenderService } from '../../code/services/render.service';

describe('RenderService', () => {
  let renderService: RenderService;

  beforeEach(() => {
    renderService = new RenderService();
  });

  describe('renderCreatePaymentMethod', () => {
    it('should render payment method creation form', () => {
      const html = renderService.renderCreatePaymentMethod({
        stripePublishableKey: 'pk_test_123',
        setupIntentClientSecret: 'seti_123_secret_456',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('pk_test_123');
      expect(html).toContain('seti_123_secret_456');
      expect(html).toContain('stripe.com/v3/');
      expect(html).toContain('payment-element');
    });

    it('should escape special characters in keys', () => {
      const html = renderService.renderCreatePaymentMethod({
        stripePublishableKey: 'pk_test_<script>',
        setupIntentClientSecret: 'seti_123',
      });

      // Should not contain unescaped script tags
      expect(html).not.toContain('<script>alert');
    });

    it('should include Stripe Elements initialization', () => {
      const html = renderService.renderCreatePaymentMethod({
        stripePublishableKey: 'pk_test_123',
        setupIntentClientSecret: 'seti_123',
      });

      expect(html).toContain('Stripe(');
      expect(html).toContain('elements.create');
      expect(html).toContain('confirmSetup');
    });
  });

  describe('renderViewPaymentMethodSummary', () => {
    it('should render payment method summary', () => {
      const html = renderService.renderViewPaymentMethodSummary({
        payment_method: {
          module: {
            payment_method: 'pm_123',
          },
        },
        paymentMethodDetails: {
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025,
          },
        },
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('visa');
      expect(html).toContain('4242');
      expect(html).toContain('12');
      expect(html).toContain('2025');
      expect(html).toContain('Stripe payment method');
    });

    it('should handle missing payment method details', () => {
      const html = renderService.renderViewPaymentMethodSummary({
        payment_method: {
          module: {
            payment_method: 'pm_123',
          },
        },
      });

      expect(html).toContain('Unknown');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should escape HTML in card details', () => {
      const html = renderService.renderViewPaymentMethodSummary({
        payment_method: {
          module: {
            payment_method: 'pm_123',
          },
        },
        paymentMethodDetails: {
          card: {
            brand: '<script>alert("xss")</script>',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025,
          },
        },
      });

      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>alert');
    });
  });

  describe('renderViewPaymentMethod', () => {
    it('should render full payment method details', () => {
      const html = renderService.renderViewPaymentMethod({
        payment_method: {
          collection_module_key: 'test_collection_module',
          module: {
            id: 'si_123',
            payment_method: 'pm_123',
            livemode: false,
            status: 'succeeded',
            usage: 'off_session',
          },
        },
        policy: {
          billing_day: 15,
        },
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('test_collection_module');
      expect(html).toContain('si_123');
      expect(html).toContain('pm_123');
      expect(html).toContain('15');
      expect(html).toContain('succeeded');
      expect(html).toContain('off_session');
    });

    it('should display all payment method fields', () => {
      const html = renderService.renderViewPaymentMethod({
        payment_method: {
          collection_module_key: 'stripe_cm',
          module: {
            id: 'si_test',
            payment_method: 'pm_test',
            livemode: true,
            status: 'succeeded',
            usage: 'off_session',
          },
        },
        policy: {
          billing_day: 1,
        },
      });

      expect(html).toContain('Collection module');
      expect(html).toContain('Key');
      expect(html).toContain('Id');
      expect(html).toContain('Payment method');
      expect(html).toContain('Billing day');
      expect(html).toContain('Livemode');
      expect(html).toContain('Status');
      expect(html).toContain('Usage');
    });

    it('should escape HTML in all fields', () => {
      const html = renderService.renderViewPaymentMethod({
        payment_method: {
          collection_module_key: '<script>xss</script>',
          module: {
            id: 'si_123',
            payment_method: 'pm_123',
            livemode: false,
            status: 'succeeded',
            usage: 'off_session',
          },
        },
        policy: {
          billing_day: 15,
        },
      });

      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>xss');
    });

    it('should include Stripe logo', () => {
      const html = renderService.renderViewPaymentMethod({
        payment_method: {
          collection_module_key: 'test',
          module: {
            id: 'si_123',
            payment_method: 'pm_123',
            livemode: false,
            status: 'succeeded',
            usage: 'off_session',
          },
        },
        policy: {
          billing_day: 1,
        },
      });

      expect(html).toContain('stripe-logo');
      expect(html).toContain('data:image/png;base64');
    });
  });

  describe('Common functionality', () => {
    it('should include common CSS styles in all renders', () => {
      const createHtml = renderService.renderCreatePaymentMethod({
        stripePublishableKey: 'pk_test',
        setupIntentClientSecret: 'seti_test',
      });

      const summaryHtml = renderService.renderViewPaymentMethodSummary({
        payment_method: { module: { payment_method: 'pm_123' } },
      });

      const detailsHtml = renderService.renderViewPaymentMethod({
        payment_method: {
          collection_module_key: 'test',
          module: {
            id: 'si_123',
            payment_method: 'pm_123',
            livemode: false,
            status: 'succeeded',
            usage: 'off_session',
          },
        },
        policy: { billing_day: 1 },
      });

      // All should include common styles
      expect(createHtml).toContain('.api-attributes');
      expect(summaryHtml).toContain('.api-attributes');
      expect(detailsHtml).toContain('.api-attributes');
    });

    it('should generate valid HTML', () => {
      const html = renderService.renderCreatePaymentMethod({
        stripePublishableKey: 'pk_test',
        setupIntentClientSecret: 'seti_test',
      });

      // Check for proper HTML structure
      expect(html).toMatch(/<!DOCTYPE html>/);
      expect(html).toMatch(/<html[^>]*>/);
      expect(html).toMatch(/<head>/);
      expect(html).toMatch(/<\/head>/);
      expect(html).toMatch(/<body>/);
      expect(html).toMatch(/<\/body>/);
      expect(html).toMatch(/<\/html>/);
    });
  });
});
