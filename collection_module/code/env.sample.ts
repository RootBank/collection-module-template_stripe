/**
 * Environment Configuration Sample
 *
 * Copy this file to env.ts and fill in your actual values.
 * OR run the setup script: bash ../setup.sh
 *
 * IMPORTANT: Never commit env.ts to version control!
 *
 * Variable names use PROVIDER_* prefix. For Stripe, these map to:
 *   PROVIDER_WEBHOOK_SIGNING_SECRET → Stripe webhook signing secret (whsec_...)
 *   PROVIDER_PUBLISHABLE_KEY        → Stripe publishable key (pk_live_... / pk_test_...)
 *   PROVIDER_SECRET_KEY             → Stripe secret key (sk_live_... / sk_test_...)
 *   PROVIDER_PRODUCT_ID             → Stripe product ID (prod_...)
 */

// ============================================================================
// ENVIRONMENT
// ============================================================================
export const NODE_ENV = 'sandbox';

// ============================================================================
// PAYMENT PROVIDER CONFIGURATION
// ============================================================================

// Webhook Signing Secrets
export const PROVIDER_WEBHOOK_SIGNING_SECRET_LIVE = 'whsec_xxxxx';
export const PROVIDER_WEBHOOK_SIGNING_SECRET_TEST = 'whsec_xxxxx';

// Product IDs (if applicable for your provider)
export const PROVIDER_PRODUCT_ID_LIVE = 'prod_xxxxx';
export const PROVIDER_PRODUCT_ID_TEST = 'prod_xxxxx';

// API Keys - Publishable (Public)
export const PROVIDER_PUBLISHABLE_KEY_LIVE = 'pk_live_xxxxx';
export const PROVIDER_PUBLISHABLE_KEY_TEST = 'pk_test_xxxxx';

// API Keys - Secret (Private) — NEVER expose these publicly!
export const PROVIDER_SECRET_KEY_LIVE = 'sk_live_xxxxx';
export const PROVIDER_SECRET_KEY_TEST = 'sk_test_xxxxx';

// ============================================================================
// ROOT PLATFORM CONFIGURATION
// ============================================================================

// Collection Module Key — must match the key in .root-config.json
export const ROOT_COLLECTION_MODULE_KEY = 'my_collection_module';

// Root API Keys
export const ROOT_API_KEY_LIVE = 'production_xxxxx';
export const ROOT_API_KEY_SANDBOX = 'sandbox_xxxxx';

// Root API Base URLs
export const ROOT_BASE_URL_LIVE = 'https://api.rootplatform.com/v1/insurance';
export const ROOT_BASE_URL_SANDBOX =
  'https://sandbox.rootplatform.com/v1/insurance';

// ============================================================================
// OPTIONAL CONFIGURATION
// ============================================================================

// Time delay for processing (in milliseconds)
export const TIME_DELAY_IN_MILLISECONDS = '10000';
