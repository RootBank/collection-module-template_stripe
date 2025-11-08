/**
 * Environment Configuration Sample
 *
 * Copy this file to env.ts and fill in your actual values.
 *
 * IMPORTANT: Never commit env.ts to version control!
 * The .gitignore file should exclude it.
 */

// ============================================================================
// ENVIRONMENT
// ============================================================================
// Set to 'development' for testing or 'production' for live deployment
export const NODE_ENV = 'development';

// ============================================================================
// PAYMENT PROVIDER CONFIGURATION (Stripe Example)
// ============================================================================

// Webhook Signing Secrets
// Get from: Stripe Dashboard → Developers → Webhooks → Signing secret
export const STRIPE_WEBHOOK_SIGNING_SECRET_LIVE = 'whsec_xxxxx';
export const STRIPE_WEBHOOK_SIGNING_SECRET_TEST = 'whsec_xxxxx';

// Product IDs (if applicable to your provider)
// Get from: Stripe Dashboard → Products
export const STRIPE_PRODUCT_ID_LIVE = 'prod_xxxxx';
export const STRIPE_PRODUCT_ID_TEST = 'prod_xxxxx';

// API Keys - Publishable (Public)
// Get from: Stripe Dashboard → Developers → API keys
export const STRIPE_PUBLISHABLE_KEY_LIVE = 'pk_live_xxxxx';
export const STRIPE_PUBLISHABLE_KEY_TEST = 'pk_test_xxxxx';

// API Keys - Secret (Private)
// Get from: Stripe Dashboard → Developers → API keys
// NEVER expose these publicly!
export const STRIPE_SECRET_KEY_LIVE = 'sk_live_xxxxx';
export const STRIPE_SECRET_KEY_TEST = 'sk_test_xxxxx';

// ============================================================================
// ROOT PLATFORM CONFIGURATION
// ============================================================================

// Collection Module Key
// This must match the key in .root-config.json
// Format: cm_yourprovider or yourorg_cm_provider
export const ROOT_COLLECTION_MODULE_KEY = 'my_collection_module_cm_stripe';

// Root API Keys
// Get from: Root Platform → Settings → API Keys
export const ROOT_API_KEY_LIVE = 'production_xxxxx';
export const ROOT_API_KEY_SANDBOX = 'sandbox_xxxxx';

// Root API Base URLs
// Production: https://api.rootplatform.com/v1/insurance
// Sandbox: https://sandbox.rootplatform.com/v1/insurance
export const ROOT_BASE_URL_LIVE = 'https://api.rootplatform.com/v1/insurance';
export const ROOT_BASE_URL_SANDBOX =
  'https://sandbox.rootplatform.com/v1/insurance';

// ============================================================================
// OPTIONAL CONFIGURATION
// ============================================================================

// Time delay for processing (in milliseconds)
// Useful for rate limiting or allowing external systems to settle
export const TIME_DELAY_IN_MILLISECONDS = '10000';

// ============================================================================
// NOTES FOR DEPLOYMENT
// ============================================================================
//
// Security:
//   - Rotate API keys regularly
//   - Use different keys for test/production
//   - Never commit env.ts to git
//   - Monitor CloudWatch Logs for suspicious activity
//
// Validation:
//   The ConfigurationService validates all values on startup
//   Missing or invalid values will throw errors with helpful messages
//
