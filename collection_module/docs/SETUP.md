# Collection Module Setup Guide

This guide will walk you through setting up a collection module from this template.

## Quick Start (5 Minutes)

### 1. Run Setup Script

```bash
# From the repository root
chmod +x setup-template.sh
./setup-template.sh
```

The script will guide you through:
- Provider name and configuration
- Collection module key setup
- Environment file creation
- Dependency installation

### 2. Update Environment Variables

```bash
cd stripe_collection_module
# Edit code/env.ts with your actual API keys
```

### 3. Validate Configuration

```bash
npm run validate
```

### 4. Run Tests

```bash
nvm use  # Use Node 18+
npm test
```

You're ready to customize! See [CUSTOMIZING.md](./CUSTOMIZING.md) for next steps.

---

## Detailed Setup Instructions

### Prerequisites

**Required:**
- Node.js 18+ (use `nvm` for version management)
- npm 8+
- Git

**Accounts Needed:**
- Root Platform account with organization access
- Payment provider account (e.g., Stripe, PayPal)
- AWS account (for Lambda deployment)

### Step 1: Clone or Copy Template

```bash
# Clone the repository
git clone <repository-url>
cd collection-module-template_stripe

# Or copy the template directory
cp -r collection-module-template_stripe my-provider-collection-module
cd my-provider-collection-module
```

### Step 2: Configure Your Provider

#### Option A: Automated Setup

```bash
./setup-template.sh
```

#### Option B: Manual Setup

1. **Update module configuration**

Edit `stripe_collection_module/.root-config.json`:

```json
{
  "collectionModuleKey": "cm_your_provider",
  "collectionModuleName": "Your Provider Collection Module",
  "organizationId": "your-root-organization-id",
  "host": "http://localhost:4000",
  "settings": {
    "legacyCodeExecution": false
  }
}
```

2. **Create environment file**

```bash
cd stripe_collection_module
cp code/env.sample.ts code/env.ts
```

3. **Update environment variables**

Edit `code/env.ts` with your actual credentials:

```typescript
// Environment
export const NODE_ENV = 'development';

// Your Provider API Keys
export const STRIPE_SECRET_KEY_LIVE = 'sk_live_YOUR_KEY';
export const STRIPE_SECRET_KEY_TEST = 'sk_test_YOUR_KEY';
// ... other keys

// Root Platform
export const ROOT_API_KEY_LIVE = 'production_YOUR_KEY';
export const ROOT_API_KEY_SANDBOX = 'sandbox_YOUR_KEY';
export const ROOT_BASE_URL_LIVE = 'https://api.rootplatform.com/v1/insurance';
export const ROOT_COLLECTION_MODULE_KEY = 'cm_your_provider';
```

### Step 3: Install Dependencies

```bash
cd stripe_collection_module

# Use correct Node version
nvm use

# Install packages
npm install
```

### Step 4: Validate Setup

Run the configuration validator:

```bash
npm run validate
```

This checks:
- All required configuration files exist
- No placeholder values remain
- TypeScript compiles successfully
- Tests pass
- Correct Node version

### Step 5: Run Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Step 6: Build

```bash
npm run build
```

This compiles TypeScript and creates the `dist/` folder.

---

## Configuration Details

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment name | `development` or `production` |
| `STRIPE_SECRET_KEY_LIVE` | Provider API secret (production) | `sk_live_...` |
| `STRIPE_SECRET_KEY_TEST` | Provider API secret (test) | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY_LIVE` | Provider publishable key (prod) | `pk_live_...` |
| `STRIPE_PUBLISHABLE_KEY_TEST` | Provider publishable key (test) | `pk_test_...` |
| `STRIPE_WEBHOOK_SIGNING_SECRET_LIVE` | Webhook secret (production) | `whsec_...` |
| `STRIPE_WEBHOOK_SIGNING_SECRET_TEST` | Webhook secret (test) | `whsec_...` |
| `ROOT_API_KEY_LIVE` | Root API key (production) | `production_...` |
| `ROOT_API_KEY_SANDBOX` | Root API key (sandbox) | `sandbox_...` |
| `ROOT_BASE_URL_LIVE` | Root API base URL (prod) | `https://api.rootplatform.com/v1/insurance` |
| `ROOT_BASE_URL_SANDBOX` | Root API base URL (sandbox) | `https://sandbox.rootplatform.com/v1/insurance` |
| `ROOT_COLLECTION_MODULE_KEY` | Your module key | `cm_your_provider` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TIME_DELAY_IN_MILLISECONDS` | Processing delay | `10000` |
| `STRIPE_PRODUCT_ID_LIVE` | Provider product ID (prod) | (optional) |
| `STRIPE_PRODUCT_ID_TEST` | Provider product ID (test) | (optional) |

### Getting API Keys

**Stripe:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → API keys
3. Copy your keys (use test keys for development)

**Root Platform:**
1. Log in to Root Platform
2. Go to Settings → API Keys
3. Create or copy existing API keys
4. Use sandbox keys for development

### Validating Configuration

The `ConfigurationService` validates your setup automatically:
- Checks all required variables are set
- Validates URL formats
- Ensures environment is valid (`production` or `development`)

If configuration is invalid, you'll see helpful error messages:

```
Configuration validation failed:
Missing required configuration values for production: stripeSecretKey, rootApiKey
Hint: Check that code/env.ts is properly configured with all required values.
For AWS Lambda: Ensure all environment variables are set in Lambda configuration.
```

---

## Development Workflow

### Local Development Setup

1. **Use test/sandbox credentials**

```typescript
// code/env.ts
export const NODE_ENV = 'development';
export const STRIPE_SECRET_KEY_LIVE = 'sk_test_...'; // Use test key
export const ROOT_API_KEY_LIVE = 'sandbox_...'; // Use sandbox key
```

2. **Run in watch mode**

```bash
npm run test:watch
```

3. **Make code changes**

Edit files in `code/` directory. Tests will re-run automatically.

4. **Check linting**

```bash
npm run lint
npm run lint:fix  # Auto-fix some issues
```

### Project Structure

```
stripe_collection_module/
├── code/                           # Source code
│   ├── core/                       # Domain models & DI container
│   │   ├── models/                 # Data models
│   │   ├── container.ts            # DI container
│   │   └── container.setup.ts      # Service registration
│   ├── services/                   # Business logic
│   │   ├── config.service.ts       # Configuration
│   │   ├── log.service.ts          # Logging
│   │   ├── stripe.service.ts       # Provider operations
│   │   └── root.service.ts         # Root operations
│   ├── clients/                    # API wrappers
│   │   ├── stripe-client.ts        # Provider SDK wrapper
│   │   └── root-client.ts          # Root SDK wrapper
│   ├── controllers/                # Event processors
│   │   ├── stripe-event-processors/
│   │   └── root-event-processors/
│   ├── lifecycle-hooks/            # Root platform hooks
│   │   └── index.ts
│   ├── utils/                      # Utilities
│   └── env.ts                      # Your environment config
├── __tests__/                      # Test files
│   ├── services/
│   ├── core/
│   └── helpers/
├── docs/                           # Documentation
├── scripts/                        # Build/deploy scripts
└── package.json
```

---

## Troubleshooting

### Error: "ENVIRONMENT is not set"

**Solution:** Set `NODE_ENV` in `code/env.ts`:

```typescript
export const NODE_ENV = 'development';
```

### Error: "Missing required configuration values"

**Solution:** Check `code/env.ts` has all required variables. Look for placeholder values like `xxxxx`.

### Error: "Module not found"

**Solution:** Install dependencies:

```bash
npm install
```

### Error: Tests failing

**Solutions:**
1. Use correct Node version: `nvm use`
2. Clear Jest cache: `npx jest --clearCache`
3. Reinstall: `rm -rf node_modules && npm install`

### Error: TypeScript compilation errors

**Solution:** Check `tsconfig.json` includes all source files and dependencies are installed.

### Validation Script Warnings

If `npm run validate` shows warnings:
- **Placeholder values**: Update `code/env.ts` and `.root-config.json` with real values
- **Linting issues**: Run `npm run lint:fix` to auto-fix
- **Node version mismatch**: Run `nvm use`

---

## Next Steps

After completing setup:

1. **Read customization guide**: [CUSTOMIZING.md](./CUSTOMIZING.md)
   - Adapt template for your payment provider
   - Implement service methods
   - Add provider-specific logic

2. **Implement webhooks**: [WEBHOOKS.md](./WEBHOOKS.md)
   - Set up webhook endpoints
   - Handle provider events
   - Test webhook delivery

3. **Deploy to Lambda**: [DEPLOYMENT.md](./DEPLOYMENT.md)
   - Configure AWS resources
   - Set up CI/CD pipeline
   - Deploy and test

4. **Review architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
   - Understand system design
   - Learn service patterns
   - Explore DI container

5. **Write tests**: [TESTING.md](./TESTING.md)
   - Add unit tests for your services
   - Create integration tests
   - Achieve good coverage

---

## Getting Help

### Documentation

- **Setup**: This file
- **Customization**: [CUSTOMIZING.md](./CUSTOMIZING.md)
- **Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Webhooks**: [WEBHOOKS.md](./WEBHOOKS.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Testing**: [TESTING.md](./TESTING.md)
- **Template Setup**: `../TEMPLATE_SETUP.md` (root)

### Common Tasks

```bash
# Validate configuration
npm run validate

# Run tests
npm test

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Build for production
npm run build

# Run specific test file
npm test -- services/log.service.test

# Watch tests
npm run test:watch

# Check coverage
npm run test:coverage
```

### Support

If you're stuck:
1. Check troubleshooting section above
2. Review relevant documentation
3. Check CloudWatch Logs (after deployment)
4. Review test output for hints

---

## Best Practices

### Security

- ✅ Never commit `code/env.ts` to git
- ✅ Use separate keys for test/production
- ✅ Rotate API keys regularly
- ✅ Use AWS Secrets Manager for production
- ✅ Enable CloudWatch Logs monitoring

### Development

- ✅ Use test/sandbox credentials locally
- ✅ Run tests before committing
- ✅ Keep test coverage above 70%
- ✅ Follow TypeScript best practices
- ✅ Use the DI container for dependencies

### Configuration

- ✅ Validate before deploying
- ✅ Document all env variables
- ✅ Use meaningful module keys
- ✅ Set appropriate time delays
- ✅ Configure proper log levels

---

## Checklist

Use this to track your setup progress:

- [ ] Cloned/copied template
- [ ] Ran setup script or manual configuration
- [ ] Created `code/env.ts` with real values
- [ ] Updated `.root-config.json`
- [ ] Installed dependencies (`npm install`)
- [ ] Ran validation (`npm run validate`)
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compiling (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] Reviewed customization guide
- [ ] Ready to implement provider logic

Once complete, move to [CUSTOMIZING.md](./CUSTOMIZING.md) to adapt the template for your provider.

