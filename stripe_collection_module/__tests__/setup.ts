/// <reference types="jest" />
/**
 * Jest setup file
 * This file runs before all tests
 */

// Set up test environment variables
process.env.ENVIRONMENT = 'development';
process.env.NODE_ENV = 'test';
process.env.ROOT_COLLECTION_MODULE_KEY = 'test_collection_module';
process.env.ROOT_COLLECTION_MODULE_SECRET = 'test_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

// Note: Global mocks removed - use test-helpers.ts setupConfigMock() instead
// This prevents conflicts when testing the actual config/log instance modules
