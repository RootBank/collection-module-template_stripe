# Getting Started with the Stripe Collection Module Template

This guide will help you set up and customize this template for your specific use case.

## Prerequisites

- Node.js 18+ (check with `node --version`)
- npm or yarn
- Root Platform account and API credentials
- Stripe account and API keys

## Initial Setup

### 1. Clone and Run Setup

```bash
# Clone the repository (or use this template)
git clone <your-repo-url>
cd collection-module-template_stripe

# Run the automated setup script
./setup.sh
```

The setup script will:
- ✓ Install all dependencies
- ✓ Configure Root Platform settings (`.root-config.json` and `.root-auth`)
- ✓ Create `code/env.ts` from the template
- ✓ Run validation checks
- ✓ Show you next steps

### 2. Configure Root Platform

The setup script will prompt you for:

**`.root-config.json`** - Collection module metadata:
- Collection Module Key (e.g., `cm_stripe_yourcompany`)
- Collection Module Name (e.g., "Your Company Stripe Integration")
- Organization ID
- Root Platform Host URL

**`.root-auth`** - Authentication:
- Root Platform API Key (stored securely, gitignored)

For detailed information about these files, see [Root Configuration Guide](stripe_collection_module/docs/ROOT_CONFIGURATION.md).

### 3. Configure Environment

Edit `stripe_collection_module/code/env.ts` with your actual credentials:

```typescript
export default {
  // Root Platform Configuration
  rootOrganisationId: 'your-org-id',
  rootApiKey: 'your-api-key',
  rootEnvironment: 'sandbox', // or 'production'
  rootBaseUrl: 'https://api.root.co.za',

  // Stripe Configuration
  stripeSecretKey: 'sk_test_...',
  stripeWebhookSigningSecret: 'whsec_...',
  stripePublishableKey: 'pk_test_...',
  stripeProductId: 'prod_...',

  // Module Configuration
  environment: 'development',
};
```

**⚠️ Important:** Never commit sensitive files to version control:
- `code/env.ts` - Contains API keys and secrets
- `.root-auth` - Contains Root Platform API key

Both files are already in `.gitignore`.

## Project Structure

```
collection-module-template_stripe/
├── setup.sh                          # Automated setup script
├── README.md                         # Main documentation
└── stripe_collection_module/
    ├── code/
    │   ├── controllers/              # Event handlers
    │   │   ├── root-event-processors/
    │   │   └── stripe-event-processors/
    │   ├── services/                 # Business logic
    │   │   ├── config.service.ts
    │   │   ├── log.service.ts
    │   │   ├── root.service.ts
    │   │   └── stripe.service.ts
    │   ├── core/                     # DI container setup
    │   ├── clients/                  # API clients
    │   ├── utils/                    # Utilities
    │   ├── lifecycle-hooks/          # Root Platform hooks
    │   ├── webhook-hooks.ts          # Stripe webhook handler
    │   └── main.ts                   # Entry point
    ├── __tests__/                    # Tests
    ├── docs/                         # Detailed documentation
    │   ├── SETUP.md
    │   ├── DEPLOYMENT.md
    │   ├── CUSTOMIZING.md
    │   └── BEST_PRACTICES.md
    └── scripts/                      # Deployment scripts
```

## Customization Steps

### 1. Update Module Metadata

Edit `stripe_collection_module/package.json`:

```json
{
  "name": "your-collection-module-name",
  "version": "1.0.0",
  "description": "Your module description"
}
```

### 2. Implement Your Controllers

The template includes example controllers. Customize them for your use case:

**Stripe Event Processor Example:**

```typescript
// code/controllers/stripe-event-processors/invoice-paid.controller.ts
export class InvoicePaidController {
  async handle(invoice: Stripe.Invoice): Promise<void> {
    // Your logic here
  }
}
```

**Root Event Processor Example:**

```typescript
// code/controllers/root-event-processors/payment-creation.controller.ts
export class PaymentCreationController {
  async handle(params: any): Promise<void> {
    // Your logic here
  }
}
```

### 3. Add Your Services

Extend or create new services in `code/services/`:

```typescript
// code/services/your-service.ts
export class YourService {
  constructor(
    private readonly logService: LogService,
    // ... other dependencies
  ) {}

  async yourMethod(): Promise<void> {
    // Your logic
  }
}
```

### 4. Register in DI Container

Add your services and controllers to `code/core/container.setup.ts`:

```typescript
container.register(
  ServiceToken.YOUR_SERVICE,
  (c) => {
    const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
    return new YourService(logService);
  },
  ServiceLifetime.SINGLETON
);
```

## Development Workflow

### Running Locally

```bash
cd stripe_collection_module

# Lint your code
npm run lint

# Run tests
npm run test

# Build the module
npm run build
```

### Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Validation

```bash
# Check configuration
npm run validate

# Format code
npm run format

# Pre-deployment checks
npm run predeploy
```

## Deployment

### First Deployment

1. Ensure all tests pass: `npm run test`
2. Build the module: `npm run build`
3. Deploy to sandbox first: `npm run deploy:sandbox`
4. Test thoroughly in sandbox environment
5. Deploy to production: `npm run deploy:production`

### Automated Deployment

The deployment script handles:
- Pre-deployment validation
- Building the module
- Git tagging (with semver)
- Publishing to Root Platform API
- Dry-run mode for testing

```bash
# Deploy to sandbox
npm run deploy:sandbox

# Deploy to production
npm run deploy:production

# Test deployment without publishing
npm run deploy:dry-run
```

See [DEPLOYMENT.md](stripe_collection_module/docs/DEPLOYMENT.md) for details.

## Configuration Management

### Environment-Specific Config

The template uses a single `env.ts` file. For multiple environments:

**Option 1: Environment Variables**

```typescript
// code/env.ts
export default {
  rootApiKey: process.env.ROOT_API_KEY || 'fallback',
  // ...
};
```

**Option 2: Multiple Config Files** (not recommended for templates)

```bash
code/env.development.ts
code/env.sandbox.ts
code/env.production.ts
```

### Secrets Management

**Never commit secrets!** The template's `.gitignore` already excludes:
- `code/env.ts` - Stripe keys and module configuration
- `.root-auth` - Root Platform API key
- `*.env` - Any environment files
- `.env*` - Environment file variants

## Next Steps

1. **Review Documentation**
   - [Customization Guide](stripe_collection_module/docs/CUSTOMIZING.md)
   - [Best Practices](stripe_collection_module/docs/BEST_PRACTICES.md)
   - [Deployment Guide](stripe_collection_module/docs/DEPLOYMENT.md)

2. **Implement Your Logic**
   - Start with one controller
   - Add services as needed
   - Write tests as you go

3. **Test Thoroughly**
   - Unit tests for services
   - Integration tests for controllers
   - Test in sandbox environment

4. **Deploy**
   - Follow the deployment guide
   - Start with sandbox
   - Monitor logs and metrics

## Getting Help

- Check the [README](stripe_collection_module/README.md) for overview
- Review [example controllers](stripe_collection_module/code/controllers/)
- See [Stripe Integration Guide](stripe_collection_module/docs/CUSTOMIZING.md)
- Root Platform docs: https://docs.root.co.za
- Stripe API docs: https://stripe.com/docs/api

## Common Issues

### "Module not found" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build failures

```bash
npm run clean
npm install
npm run build
```

### Type errors from SDKs

Make sure you're using the correct SDK types:
- Stripe types: `Stripe.Customer`, `Stripe.Invoice`, etc.
- Root types: `root.Policy`, `root.PaymentMethod`, etc.

### Deployment fails

1. Check your API credentials in `env.ts`
2. Ensure tests pass: `npm run test`
3. Try dry-run first: `npm run deploy:dry-run`

## Contributing to the Template

If you find improvements that would benefit all users of this template:

1. Keep changes generic and configurable
2. Update documentation
3. Add tests
4. Submit a pull request

---

**Ready to build?** Start with `./setup.sh` and follow the wizard! 🚀

