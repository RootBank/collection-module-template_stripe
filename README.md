# Stripe Collection Module Template

A production-ready template for building collection modules that integrate Stripe with the Root Platform. Includes comprehensive testing, structured logging, and clear architecture patterns.

---

## 🚀 Quick Start

### Automated Setup (Recommended)

```bash
./setup.sh
```

This will automatically:
- ✓ Install all dependencies
- ✓ Configure Root Platform settings (`.root-config.json` and `.root-auth`)
- ✓ Create your environment file from template
- ✓ Run validation checks
- ✓ Show you next steps

### Manual Setup

```bash
cd stripe_collection_module
npm install
cp code/env.sample.ts code/env.ts
# Edit code/env.ts with your Stripe API keys
npm run validate
npm test
```

### Start Implementing

See [docs/CUSTOMIZING.md](./stripe_collection_module/docs/CUSTOMIZING.md) to implement Stripe integration.

---

## 📋 What's Included

This template provides:

- ✅ **Root Platform Ready** - Optimized for Root Platform deployment
- ✅ **Comprehensive Testing** - Jest with 60+ tests, factories, and utilities
- ✅ **Structured Logging** - JSON logging integrated with Root Platform
- ✅ **Dependency Injection** - Clean, testable service architecture
- ✅ **Type-Safe Configuration** - Injectable, validated configuration service
- ✅ **Stripe Integration** - Ready-to-implement Stripe service stubs
- ✅ **Production Best Practices** - Error handling, retries, monitoring
- ✅ **Complete Documentation** - Setup, deployment, customization guides

---

## 📚 Documentation

### Getting Started

- **[Getting Started](./SETUP.md)** - Complete walkthrough for new users
- **[Setup Guide](./stripe_collection_module/docs/SETUP.md)** - Detailed setup reference
- **[Root Configuration](./stripe_collection_module/docs/ROOT_CONFIGURATION.md)** - Root Platform config files
- **[Implementation Guide](./stripe_collection_module/docs/CUSTOMIZING.md)** - Stripe implementation guide

### Development

- **[Architecture](./stripe_collection_module/docs/ARCHITECTURE.md)** - System design and patterns
- **[Testing Guide](./stripe_collection_module/docs/TESTING.md)** - Writing and running tests
- **[Best Practices](./stripe_collection_module/docs/BEST_PRACTICES.md)** - Production patterns

### Deployment

- **[Deployment Guide](./stripe_collection_module/docs/DEPLOYMENT.md)** - Root Platform deployment
- **[Webhooks Setup](./stripe_collection_module/docs/WEBHOOKS.md)** - Webhook configuration
- **[Log Viewing](./stripe_collection_module/docs/LOG_VIEWING.md)** - Root Platform log access

---

## 🏗️ Architecture

```
Stripe → Root Platform → Stripe Collection Module → Root API
              ↓
    Root Platform Logs
```

### Key Components

**Core Services:**
- `ConfigurationService` - Type-safe, validated configuration
- `LogService` - Dual-output structured logging
- `RenderService` - HTML generation for dashboards

**Stripe Integration:**
- Stripe SDK client wrapper
- Stripe service layer for business logic
- Stripe webhook event processors
- Stripe to Root data adapters

**Root Integration:**
- Root API client wrapper
- Policy and payment management
- Lifecycle hook handlers

### Project Structure

```
stripe_collection_module/
├── code/
│   ├── core/                # DI container & domain models
│   ├── services/            # Business logic
│   ├── clients/             # API wrappers
│   ├── controllers/         # Event processors
│   ├── lifecycle-hooks/     # Root platform hooks
│   ├── utils/               # Utilities
│   └── env.sample.ts        # Configuration template
├── __tests__/               # Comprehensive test suite
├── docs/                    # Detailed documentation
├── infrastructure/          # AWS templates (SAM/CloudFormation)
└── scripts/                 # Build and deployment scripts
```

---

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment name | `production` or `development` |
| `STRIPE_SECRET_KEY_LIVE` | Stripe API secret key | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY_LIVE` | Stripe publishable key | `pk_live_...` |
| `STRIPE_WEBHOOK_SIGNING_SECRET_LIVE` | Stripe webhook secret | `whsec_...` |
| `ROOT_API_KEY_LIVE` | Root API key | `production_...` |
| `ROOT_BASE_URL_LIVE` | Root API URL | `https://api.rootplatform.com/v1/insurance` |
| `ROOT_COLLECTION_MODULE_KEY` | Module identifier | `cm_stripe` |

See `stripe_collection_module/code/env.sample.ts` for complete configuration template.

### Configuration Files

- `stripe_collection_module/code/env.ts` - Environment variables (gitignored)
- `stripe_collection_module/.root-config.json` - Root module config
- `stripe_collection_module/package.json` - Dependencies and scripts

---

## 🧪 Testing

```bash
cd stripe_collection_module

# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# Validate configuration
npm run validate
```

### Test Coverage

- **Services**: 80%+ coverage
- **Core**: 90%+ coverage
- **Overall**: 70%+ coverage

See [docs/TESTING.md](./stripe_collection_module/docs/TESTING.md) for testing guide.

---

## 🚢 Deployment

### Root Platform Deployment

Deployment is handled through the Root Platform API:

```bash
# Prepare for deployment
cd stripe_collection_module
npm run validate
npm test
npm run build

# Tag your release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Publish to Root Platform (Sandbox)
curl -X POST \
  -H "Authorization: Basic {{api_key}}" \
  "{{host}}/v1/apps/{{org_id}}/insurance/collection-modules/{{cm_key}}/publish?bumpSandbox=true"

# Publish to Production
curl -X POST \
  -H "Authorization: Basic {{api_key}}" \
  "{{host}}/v1/apps/{{org_id}}/insurance/collection-modules/{{cm_key}}/publish?bumpSandbox=false"
```

See [docs/DEPLOYMENT.md](./stripe_collection_module/docs/DEPLOYMENT.md) for detailed deployment guide.

### Environment-Specific Deployment

**Sandbox:**
- Use sandbox/test credentials
- Deploy with `bumpSandbox=true`
- Test with provider sandbox

**Production:**
- Use production credentials
- Deploy with `bumpSandbox=false`
- Configure via Root Platform dashboard
- Monitor via Root Platform logs

---

## 🔍 Monitoring

### Root Platform Logs

Structured JSON logs accessible via Root Platform:

- View logs in Root Platform dashboard
- Filter by severity, time, or search terms
- Monitor real-time activity
- Track webhook processing
- Debug lifecycle hook execution

### Metrics

Track via Root Platform dashboard:
- Request volume
- Error rates
- Processing latency
- Webhook delivery status
- API call success rates

### Monitoring

Set up monitoring for:
- High error rates
- Slow response times
- Failed webhook deliveries
- API connectivity issues

---

## 🔐 Security

### Best Practices

- ✅ Store secrets securely (never commit env.ts)
- ✅ Verify all webhook signatures
- ✅ Validate all inputs
- ✅ Never log sensitive data (API keys, PII, card numbers)
- ✅ Use environment-specific credentials
- ✅ Rotate API keys quarterly
- ✅ Use Stripe test mode for development
- ✅ Monitor security events in Root Platform dashboard

### Webhook Security

All webhooks must:
1. Verify signature from provider
2. Validate event structure
3. Log processing attempts
4. Handle duplicate events (idempotency)

See [docs/WEBHOOKS.md](./stripe_collection_module/docs/WEBHOOKS.md) for implementation details.

---

## 🎯 Implementing Stripe Integration

This template provides a complete structure for Stripe integration with stub implementations.

### Implementation Steps

1. **Implement Services** - Complete the stub methods in `code/services/stripe.service.ts`
2. **Add Stripe Clients** - Configure Stripe SDK client in `code/clients/stripe-client.ts`
3. **Create Event Processors** - Implement Stripe webhook handlers in `code/controllers/stripe-event-processors/`
4. **Wire Lifecycle Hooks** - Connect Root Platform lifecycle hooks to Stripe operations
5. **Add Validation** - Implement input validation with Joi
6. **Write Tests** - Add comprehensive test coverage

See [docs/CUSTOMIZING.md](./stripe_collection_module/docs/CUSTOMIZING.md) for detailed implementation guide.

### Included Patterns

The template includes:
- Retry logic with exponential backoff
- Error handling and classification
- Webhook signature verification
- Idempotency handling
- Structured logging
- Dependency injection

---

## 📦 Features

### Logging System

**Structured logging:**
- JSON logs to Root Platform
- Multiple log levels (DEBUG, INFO, WARN, ERROR)
- Rich metadata support
- Request tracking
- Easy debugging via dashboard

### Dependency Injection

**Clean, testable architecture:**
- Custom DI container (no heavy frameworks)
- Service lifetime management (singleton/transient)
- Easy mocking for tests
- Clear dependency graphs

### Configuration Management

**Type-safe configuration:**
- Injectable `ConfigurationService`
- Environment-specific configs
- Validation on startup
- Helpful error messages

### Testing Infrastructure

**Comprehensive test support:**
- Jest with TypeScript
- Test utilities and helpers
- Mock factories for common objects
- High test coverage (70%+)

---

## 🛠️ Available Scripts

```bash
# Validation
npm run validate     # Validate configuration

# Development
npm run lint         # Check code quality
npm run lint:fix     # Auto-fix linting issues
npm run prettier     # Format code
npm test             # Run tests
npm run test:watch   # Watch mode

# Build
npm run build        # Compile TypeScript
npm run package:lambda  # Create deployment package

# Cleanup
npm run clean        # Remove build artifacts
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "ENVIRONMENT is not set" | Set `NODE_ENV` in `code/env.ts` |
| "Module not found" errors | Run `npm install` |
| Tests failing | Run `nvm use` then `npm install` |
| TypeScript errors | Check `tsconfig.json` includes all files |
| Placeholder warnings | Update `code/env.ts` with real values |

See documentation for detailed troubleshooting guides.

---

## 📝 Maintenance

### Regular Tasks

- **Weekly**: Review logs and metrics
- **Monthly**: Update dependencies
- **Quarterly**: Rotate API keys
- **As Needed**: Update documentation

### Monitoring

- Check Root Platform dashboard daily
- Review error rates and patterns
- Monitor webhook processing
- Track API success rates

---

## 🤝 Contributing to Template

When improving this template:

1. Keep it Stripe-focused
2. Update documentation
3. Add tests for new features
4. Follow existing patterns
5. Update this README

---

## 📄 License

Review the LICENSE file for usage terms.

---

## 🔗 Resources

### Stripe Documentation

- **Stripe API**: https://stripe.com/docs/api
- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **Stripe Testing**: https://stripe.com/docs/testing
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Stripe Node.js**: https://github.com/stripe/stripe-node

### Root Platform

- **Root Platform Documentation**: Contact your Root representative
- **API Reference**: Available in Root Platform dashboard
- **Collection Modules**: Platform-specific documentation

---

## 📞 Support

### Documentation

All documentation is in `stripe_collection_module/docs/`:
- Setup and configuration
- Customization guide
- Deployment instructions
- Testing guide
- Best practices
- Architecture overview

### Getting Help

1. Check the [documentation](./stripe_collection_module/docs/)
2. Review [troubleshooting](#troubleshooting) section
3. Check Root Platform logs for errors
4. Review Stripe documentation

---

## ✨ What's Next?

After setup:

1. **Implement** - Complete Stripe service implementations ([docs/CUSTOMIZING.md](./stripe_collection_module/docs/CUSTOMIZING.md))
2. **Test** - Write comprehensive tests ([docs/TESTING.md](./stripe_collection_module/docs/TESTING.md))
3. **Deploy** - Publish to Root Platform ([docs/DEPLOYMENT.md](./stripe_collection_module/docs/DEPLOYMENT.md))
4. **Monitor** - Review Root Platform logs and metrics
5. **Iterate** - Refine based on production usage

---

**Built with ❤️ for the Root Platform**
