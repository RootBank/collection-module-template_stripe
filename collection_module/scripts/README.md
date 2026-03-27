# Deployment Scripts

This directory contains scripts for deploying the Stripe Collection Module to the Root Platform.

## Quick Start

### Using npm scripts (recommended)

```bash
# Deploy to sandbox
npm run deploy:sandbox

# Deploy to production (requires version tag)
npm run deploy:production v1.0.0

# Dry run (show what would happen without executing)
npm run deploy:dry-run production v1.0.0
```

### Using the deploy script directly

```bash
# Deploy to sandbox
./scripts/deploy.sh sandbox

# Deploy to sandbox with version tag
./scripts/deploy.sh sandbox v1.0.0

# Deploy to production
./scripts/deploy.sh production v1.0.0

# Dry run
./scripts/deploy.sh --dry-run production v1.0.0
```

## Prerequisites

Set these environment variables or pass them as flags:

```bash
export ROOT_API_KEY="your_api_key_here"
export ROOT_ORG_ID="your_org_id_here"
export ROOT_HOST="https://api.rootplatform.com"  # Optional
export CM_KEY="cm_stripe"  # Optional
```

Or use command-line flags:

```bash
./scripts/deploy.sh \
  -k "your_api_key" \
  -o "your_org_id" \
  -h "https://api.rootplatform.com" \
  -c "cm_stripe" \
  production v1.0.0
```

## What the Deployment Script Does

1. **Validates Configuration** - Runs `npm run validate`
2. **Runs Tests** - Executes `npm test` (skip with `--skip-tests`)
3. **Lints Code** - Runs `npm run lint`
4. **Builds** - Compiles TypeScript (skip with `--skip-build`)
5. **Creates Git Tag** - Tags the release (skip with `--skip-tag`)
6. **Publishes to Root Platform** - Calls the Root Platform API

## Options

```
Usage: deploy.sh [OPTIONS] <environment> [version]

Arguments:
    environment     Target environment: 'sandbox' or 'production'
    version         Git tag version (e.g., v1.0.0) - optional for sandbox

Options:
    -k, --api-key KEY       Root Platform API key
    -o, --org-id ID         Root organization ID
    -h, --host URL          Root Platform host
    -c, --cm-key KEY        Collection module key
    --skip-tests            Skip running tests
    --skip-build            Skip build step
    --skip-tag              Skip creating git tag
    --dry-run               Show what would be done without executing
    --help                  Show help message
```

## Examples

### Deploy to Sandbox

```bash
# Simple deployment to sandbox
./scripts/deploy.sh sandbox

# With version tag
./scripts/deploy.sh sandbox v1.0.0

# Skip tests (faster, for quick iterations)
./scripts/deploy.sh --skip-tests sandbox
```

### Deploy to Production

```bash
# Standard production deployment
./scripts/deploy.sh production v1.1.0

# With explicit credentials
./scripts/deploy.sh \
  -k "prod_api_key" \
  -o "org_id_123" \
  production v1.1.0

# Dry run first (recommended)
./scripts/deploy.sh --dry-run production v1.1.0
# Review output, then run for real
./scripts/deploy.sh production v1.1.0
```

### Testing and Development

```bash
# Dry run - see what would happen
./scripts/deploy.sh --dry-run sandbox v1.0.0-beta

# Skip tests and build for faster iteration
./scripts/deploy.sh --skip-tests --skip-build sandbox

# Skip git tagging (if managing tags manually)
./scripts/deploy.sh --skip-tag production v1.2.0
```

## Workflow

### Standard Development Workflow

1. **Make changes** to your collection module
2. **Test locally** with `npm test`
3. **Deploy to sandbox** for integration testing
   ```bash
   npm run deploy:sandbox
   ```
4. **Test in sandbox** - verify everything works
5. **Create version tag** and **deploy to production**
   ```bash
   ./scripts/deploy.sh production v1.0.0
   ```
6. **Monitor** the deployment in Root Platform dashboard

### Hotfix Workflow

1. **Create hotfix branch**
   ```bash
   git checkout -b hotfix/fix-payment-issue
   ```
2. **Make fix** and test
3. **Deploy directly to sandbox**
   ```bash
   ./scripts/deploy.sh --skip-tag sandbox
   ```
4. **Verify fix** in sandbox
5. **Merge and deploy to production**
   ```bash
   git checkout main
   git merge hotfix/fix-payment-issue
   ./scripts/deploy.sh production v1.0.1
   ```

## Environment Variables

### Required

- `ROOT_API_KEY` - Your Root Platform API key
- `ROOT_ORG_ID` - Your Root organization ID

### Optional

- `ROOT_HOST` - Root Platform API URL (default: https://api.rootplatform.com)
- `CM_KEY` - Collection module key (default: cm_stripe)

### Setting Up Environment Variables

Create a `.env` file (gitignored) in the project root:

```bash
# .env
ROOT_API_KEY=sandbox_sk_abc123...
ROOT_ORG_ID=00000000-0000-0000-0000-000000000001
ROOT_HOST=https://api.rootplatform.com
CM_KEY=cm_stripe
```

Then source it before deploying:

```bash
source .env
./scripts/deploy.sh sandbox
```

Or use a tool like `direnv` for automatic loading.

## Troubleshooting

### "ROOT_API_KEY is not set"

**Solution:** Set the environment variable or use the `-k` flag:
```bash
export ROOT_API_KEY="your_key"
# or
./scripts/deploy.sh -k "your_key" sandbox
```

### "Tests failed"

**Solution:** Fix the failing tests or skip them (not recommended for production):
```bash
./scripts/deploy.sh --skip-tests sandbox
```

### "Configuration validation failed"

**Solution:** Check your `code/env.ts` file has all required values:
```bash
npm run validate
```

### "Not a git repository"

**Solution:** Initialize git or use `--skip-tag`:
```bash
git init
# or
./scripts/deploy.sh --skip-tag sandbox
```

### API Call Failed

**Solution:** 
- Verify API key has deployment permissions
- Check organization ID is correct
- Verify collection module key matches Root Platform
- Check Root Platform status page

## Security Notes

- **Never commit API keys** to version control
- Use different API keys for sandbox and production
- Store production keys securely (1Password, Vault, etc.)
- Rotate API keys quarterly
- Use read-only keys for monitoring, write keys only for deployment

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy
on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./collection_module
        run: npm ci
      
      - name: Deploy to Sandbox
        if: contains(github.ref, '-beta')
        working-directory: ./collection_module
        env:
          ROOT_API_KEY: ${{ secrets.ROOT_SANDBOX_API_KEY }}
          ROOT_ORG_ID: ${{ secrets.ROOT_ORG_ID }}
        run: npm run deploy:sandbox
      
      - name: Deploy to Production
        if: "!contains(github.ref, '-beta')"
        working-directory: ./collection_module
        env:
          ROOT_API_KEY: ${{ secrets.ROOT_PRODUCTION_API_KEY }}
          ROOT_ORG_ID: ${{ secrets.ROOT_ORG_ID }}
        run: ./scripts/deploy.sh production ${{ github.ref_name }}
```

## Related Documentation

- [Deployment Guide](../docs/DEPLOYMENT.md) - Detailed deployment documentation
- [Setup Guide](../docs/SETUP.md) - Initial setup instructions
- [Testing Guide](../docs/TESTING.md) - Testing strategies

## Support

For issues with deployment:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review logs with `--dry-run` flag
3. Verify credentials and configuration
4. Check Root Platform status page
5. Contact Root Platform support

