# Root Platform Configuration

This guide explains how to configure your collection module for the Root Platform.

## Configuration Files

### `.root-config.json`

This file contains the collection module metadata and settings used by the Root Platform.

**Location:** `stripe_collection_module/.root-config.json`

**Format:**

```json
{
  "collectionModuleKey": "cm_stripe_yourcompany",
  "collectionModuleName": "Your Company Stripe Integration",
  "organizationId": "00000000-0000-0000-0000-000000000001",
  "host": "https://api.rootplatform.com",
  "settings": {
    "legacyCodeExecution": false
  },
  "manualTransactions": []
}
```

**Fields:**

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `collectionModuleKey` | ✓ | Unique identifier for your collection module. Must start with `cm_` | `cm_stripe_acme` |
| `collectionModuleName` | ✓ | Human-readable name displayed in Root Platform dashboard | `"ACME Stripe Integration"` |
| `organizationId` | ✓ | Your Root Platform organization ID (UUID format) | `"12345678-1234-..."` |
| `host` | ✓ | Root Platform API URL | `"https://api.rootplatform.com"` |
| `settings.legacyCodeExecution` | ✓ | Whether to use legacy execution mode (should be `false` for new modules) | `false` |
| `manualTransactions` | ✓ | Array of manual transaction configurations (usually empty) | `[]` |

**Naming Conventions:**

- **Collection Module Key**: Use lowercase with underscores, format: `cm_{provider}_{company}`
  - Good: `cm_stripe_acme`, `cm_stripe_widgets_inc`
  - Bad: `stripeModule`, `cm-stripe-acme`, `STRIPE_CM`

- **Collection Module Name**: Use Title Case, be descriptive
  - Good: `"ACME Stripe Integration"`, `"Widgets Inc Payment Collection"`
  - Bad: `"stripe"`, `"collection_module"`, `"CM"`

**Environment-Specific Configuration:**

For different environments (sandbox/production), you can:

1. **Option 1: Single config with environment variable**
   ```json
   {
     "host": "https://api.rootplatform.com",
     ...
   }
   ```
   Use different API keys in `.root-auth` for sandbox vs production.

2. **Option 2: Multiple config files** (not recommended for this template)
   ```
   .root-config.sandbox.json
   .root-config.production.json
   ```

**⚠️ Important Notes:**

- This file is **NOT** gitignored - it contains configuration metadata, not secrets
- The `.root-config.json` should be committed to version control
- Secrets go in `.root-auth` (which IS gitignored)

---

### `.root-auth`

This file contains authentication credentials for the Root Platform API.

**Location:** `stripe_collection_module/.root-auth`

**Format:**

```bash
ROOT_API_KEY=sandbox_sk_abc123...
```

**Fields:**

| Variable | Description | Example |
|----------|-------------|---------|
| `ROOT_API_KEY` | Your Root Platform API key | `sandbox_sk_abc123...` or `production_sk_xyz789...` |

**Getting Your API Key:**

1. Log in to the Root Platform dashboard
2. Navigate to **Settings → API Keys**
3. Generate a new API key with appropriate permissions:
   - **Sandbox keys**: Start with `sandbox_sk_`
   - **Production keys**: Start with `production_sk_`

**Environment-Specific Keys:**

For local development and deployment to different environments:

**Sandbox/Development:**
```bash
ROOT_API_KEY=sandbox_sk_abc123...
```

**Production:**
```bash
ROOT_API_KEY=production_sk_xyz789...
```

**⚠️ Security:**

- **NEVER commit `.root-auth` to version control** (already in `.gitignore`)
- Store production keys securely (1Password, AWS Secrets Manager, etc.)
- Rotate API keys quarterly
- Use sandbox keys for all development and testing
- Use different API keys for CI/CD vs local development

---

## Setup Process

### Automated Setup (Recommended)

Run the setup script from the repository root:

```bash
./setup.sh
```

The script will prompt you for:
1. Collection Module Key
2. Collection Module Name
3. Organization ID
4. Root Platform Host
5. Root Platform API Key

All values will be saved to the appropriate files.

### Manual Setup

1. **Configure `.root-config.json`:**
   ```bash
   cd stripe_collection_module
   # Edit the file with your values
   nano .root-config.json
   ```

2. **Create `.root-auth`:**
   ```bash
   cd stripe_collection_module
   cp .root-auth.sample .root-auth
   # Edit with your actual API key
   nano .root-auth
   ```

---

## Validation

### Verify Configuration

Check that your configuration is valid:

```bash
cd stripe_collection_module

# Check .root-config.json format
cat .root-config.json | jq '.'

# Verify .root-auth exists and has correct format
if [ -f .root-auth ]; then
  echo "✓ .root-auth exists"
  grep -q "ROOT_API_KEY=" .root-auth && echo "✓ ROOT_API_KEY is set"
else
  echo "❌ .root-auth not found"
fi
```

### Test API Connection

You can test your Root Platform connection using the Root Platform CLI or a simple curl command:

```bash
# Using curl
curl -H "Authorization: Basic $(cat .root-auth | grep ROOT_API_KEY | cut -d= -f2)" \
  "https://api.rootplatform.com/v1/insurance/organizations/$(jq -r .organizationId .root-config.json)"

# Expected: JSON response with organization details
```

---

## Troubleshooting

### "collectionModuleKey is invalid"

**Problem:** The collection module key doesn't match Root Platform requirements.

**Solution:** 
- Must start with `cm_`
- Use only lowercase letters, numbers, and underscores
- Should be unique within your organization
- Format: `cm_{provider}_{company}`

### "Unauthorized" or "Invalid API key"

**Problem:** The API key in `.root-auth` is invalid or expired.

**Solution:**
1. Check the API key is correct (no extra spaces/newlines)
2. Verify key has not been revoked in Root Platform dashboard
3. Ensure you're using the right environment key (sandbox vs production)
4. Generate a new API key if needed

### "Organization not found"

**Problem:** The `organizationId` in `.root-config.json` is incorrect.

**Solution:**
1. Log in to Root Platform dashboard
2. Check your organization ID in **Settings → Organization**
3. Update `.root-config.json` with correct UUID

### ".root-auth not found" during deployment

**Problem:** The `.root-auth` file is missing.

**Solution:**
```bash
cd stripe_collection_module
cp .root-auth.sample .root-auth
# Edit with your API key
nano .root-auth
```

### "Cannot read property 'host' of undefined"

**Problem:** The `.root-config.json` file is malformed or missing.

**Solution:**
```bash
# Validate JSON syntax
cat .root-config.json | jq '.'

# If invalid, restore from sample
cp .root-config.json.sample .root-config.json
# Then edit with your values
```

---

## Environment Variables

Some deployment scenarios may require environment variables instead of or in addition to config files:

```bash
# For deployment scripts
export ROOT_API_KEY="sandbox_sk_abc123..."
export ROOT_ORG_ID="00000000-0000-0000-0000-000000000001"
export ROOT_HOST="https://api.rootplatform.com"
export CM_KEY="cm_stripe_yourcompany"
```

The deployment script (`scripts/deploy.sh`) can read from either:
1. `.root-auth` and `.root-config.json` files (preferred)
2. Environment variables (for CI/CD)

---

## Best Practices

### Local Development

- ✅ Use sandbox API keys
- ✅ Keep `.root-auth` in your local directory only
- ✅ Never commit `.root-auth` to git
- ✅ Test with sandbox environment before production

### CI/CD Deployment

- ✅ Store API keys in CI/CD secrets (GitHub Secrets, GitLab CI Variables, etc.)
- ✅ Use environment variables in deployment scripts
- ✅ Rotate API keys regularly
- ✅ Use different keys for sandbox and production pipelines

### Security

- ✅ Treat `.root-auth` like a password file
- ✅ Never share API keys via email or chat
- ✅ Use 1Password or similar for team sharing
- ✅ Audit API key usage regularly in Root Platform dashboard
- ✅ Revoke unused or compromised keys immediately

### Version Control

- ✅ Commit `.root-config.json` (no secrets)
- ✅ Commit `.root-config.json.sample` (template)
- ✅ Commit `.root-auth.sample` (template)
- ❌ Never commit `.root-auth` (contains secrets)
- ❌ Never commit backup files like `.root-auth.backup`

---

## Related Documentation

- [Setup Guide](SETUP.md) - Complete setup walkthrough
- [Deployment Guide](DEPLOYMENT.md) - Deploying to Root Platform
- [Environment Configuration](../code/env.sample.ts) - Stripe and module configuration

---

## Support

If you encounter issues with Root Platform configuration:

1. Check this documentation
2. Verify your API key in Root Platform dashboard
3. Review Root Platform logs for errors
4. Contact your Root Platform representative
