# Collection Module Deployment Guide

This guide covers deploying your collection module to the Root Platform.

## Overview

Collection modules are deployed through the Root Platform API. Root Platform handles all infrastructure, hosting, and execution automatically. You simply:

1. Develop and test your collection module locally
2. Commit your changes to version control
3. Create a release/tag
4. Publish the version via the Root Platform API

Root Platform takes care of:
- Infrastructure provisioning
- Code deployment
- Environment configuration
- Scaling and availability
- Monitoring and logging

---

## Prerequisites

### Required

- Completed and tested collection module
- Root Platform account with organization access
- Root Platform API key
- Git repository (recommended)

### You'll Need

| Item | Description | Where to Find |
|------|-------------|---------------|
| API Key | Root Platform API key | Root Platform → Settings → API Keys |
| Organization ID | Your Root organization ID | Root Platform → Organization Settings |
| Collection Module Key | Your module's unique key | Defined in `.root-config.json` |
| Host URL | Root Platform API URL | `https://api.rootplatform.com` or regional variant |

---

## Deployment Process

### Step 1: Prepare Your Code

Ensure your collection module is ready for deployment:

```bash
cd collection_module

# Run validation
npm run validate

# Run all tests
npm test

# Check code quality
npm run lint

# Build (optional - Root Platform may build for you)
npm run build
```

**Checklist:**
- [ ] All tests passing
- [ ] No linting errors
- [ ] Configuration validated
- [ ] Code committed to git
- [ ] Sensitive data not committed (env.ts is gitignored)

### Step 2: Create a Release

Create a version tag in your git repository:

```bash
# Tag your release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Or create a GitHub/GitLab release
```

**Version Naming:**
- Use semantic versioning: `v1.0.0`, `v1.1.0`, `v2.0.0`
- Include release notes describing changes
- Tag stable, tested versions only

### Step 3: Publish to Root Platform

Publish your collection module version via the Root Platform API:

```bash
curl -X POST \
  -H "Authorization: Basic {{api_key}}" \
  "{{host}}/v1/apps/{{org_id}}/insurance/collection-modules/{{cm_key}}/publish?bumpSandbox=true"
```

**Parameters:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `{{api_key}}` | Your Root Platform API key (as username in Basic Auth) | `sandbox_abc123...` |
| `{{host}}` | Root Platform API URL | `https://api.rootplatform.com` |
| `{{org_id}}` | Your organization ID | `00000000-0000-0000-0000-000000000001` |
| `{{cm_key}}` | Collection module key | `cm_stripe` |
| `bumpSandbox` | Publish to sandbox (true) or production (false) | `true` or `false` |

**Example:**

```bash
curl -X POST \
  -H "Authorization: Basic sandbox_sk_abc123xyz..." \
  "https://api.rootplatform.com/v1/apps/00000000-0000-0000-0000-000000000001/insurance/collection-modules/cm_stripe/publish?bumpSandbox=true"
```

**Response:**

```json
{
  "success": true,
  "version": "1.0.0",
  "status": "published",
  "environment": "sandbox"
}
```

### Step 4: Verify Deployment

After publishing, verify your deployment:

1. **Check Root Platform Dashboard**
   - Navigate to Collection Modules
   - Verify version is shown as deployed
   - Check deployment status

2. **Test Functionality**
   - Create a test policy
   - Assign a payment method
   - Verify webhooks are received
   - Check logs for any errors

3. **Monitor Logs**
   - Access logs via Root Platform dashboard
   - Look for any deployment errors
   - Verify lifecycle hooks are executing

---

## Environment-Specific Deployment

### Sandbox Deployment

Deploy to sandbox for testing:

```bash
npm run deploy:sandbox
```

```bash
curl -X POST \
  -H "Authorization: Basic {{sandbox_api_key}}" \
  "{{host}}/v1/apps/{{org_id}}/insurance/collection-modules/{{cm_key}}/publish?bumpSandbox=true"
```

**Use sandbox for:**
- Testing new features
- Integration testing
- QA validation
- Demo environments

### Production Deployment

Deploy to production after thorough testing:

```bash
npm run deploy:production
```

```bash
curl -X POST \
  -H "Authorization: Basic {{production_api_key}}" \
  "{{host}}/v1/apps/{{org_id}}/insurance/collection-modules/{{cm_key}}/publish?bumpSandbox=false"
```

**Production checklist:**
- [ ] Tested in sandbox
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Rollback plan prepared
- [ ] Monitoring configured

---

## Configuration Management

### Environment Variables

Collection modules get configuration from:

1. **Root Platform Settings**
   - Configured in the Root Platform dashboard
   - Managed per environment (sandbox/production)
   - Secure storage of API keys and secrets

2. **Collection Module Metadata**
   - Defined in your code
   - Available via Root Platform context

### Setting Environment Variables

Configure in Root Platform dashboard:
1. Navigate to Collection Modules → Your Module
2. Go to Settings/Configuration
3. Add environment variables:
   - Provider API keys
   - Webhook secrets
   - Feature flags
   - Timeouts

**Security Note:** Never commit sensitive values. Use Root Platform's secure configuration.

---

## Versioning Strategy

### Semantic Versioning

Follow semantic versioning (semver):

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR** - Breaking changes (e.g., `1.0.0` → `2.0.0`)
- **MINOR** - New features, backward compatible (e.g., `1.0.0` → `1.1.0`)
- **PATCH** - Bug fixes, backward compatible (e.g., `1.0.0` → `1.0.1`)

**Examples:**

```bash
# Patch release (bug fix)
git tag -a v1.0.1 -m "Fix payment processing bug"

# Minor release (new feature)
git tag -a v1.1.0 -m "Add refund support"

# Major release (breaking change)
git tag -a v2.0.0 -m "New API structure"
```

### Version History

Maintain clear version history:

**CHANGELOG.md:**
```markdown
# Changelog

## [1.1.0] - 2025-11-06
### Added
- Refund processing support
- Enhanced error messages

### Fixed
- Payment timeout handling

## [1.0.0] - 2025-11-01
### Added
- Initial release
- Payment processing
- Webhook handling
```

---

## Continuous Deployment

### GitHub Actions Example

Automate deployment with CI/CD:

**.github/workflows/deploy.yml:**

```yaml
name: Deploy Collection Module

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./collection_module
        run: npm ci
      
      - name: Run tests
        working-directory: ./collection_module
        run: npm test
      
      - name: Validate configuration
        working-directory: ./collection_module
        run: npm run validate
      
      - name: Publish to Root Platform (Sandbox)
        if: contains(github.ref, '-beta')
        run: |
          curl -X POST \
            -H "Authorization: Basic ${{ secrets.ROOT_SANDBOX_API_KEY }}" \
            "${{ secrets.ROOT_HOST }}/v1/apps/${{ secrets.ROOT_ORG_ID }}/insurance/collection-modules/${{ secrets.CM_KEY }}/publish?bumpSandbox=true"
      
      - name: Publish to Root Platform (Production)
        if: "!contains(github.ref, '-beta')"
        run: |
          curl -X POST \
            -H "Authorization: Basic ${{ secrets.ROOT_PRODUCTION_API_KEY }}" \
            "${{ secrets.ROOT_HOST }}/v1/apps/${{ secrets.ROOT_ORG_ID }}/insurance/collection-modules/${{ secrets.CM_KEY }}/publish?bumpSandbox=false"
```

**GitHub Secrets Required:**
- `ROOT_SANDBOX_API_KEY`
- `ROOT_PRODUCTION_API_KEY`
- `ROOT_HOST`
- `ROOT_ORG_ID`
- `CM_KEY`

---

## Rollback Strategy

### Rolling Back a Deployment

If issues occur, rollback to previous version:

1. **Identify Previous Version**
   ```bash
   git tag -l
   # v1.0.0
   # v1.0.1
   # v1.1.0 (current, broken)
   ```

2. **Publish Previous Version**
   ```bash
   git checkout v1.0.1
   
   curl -X POST \
     -H "Authorization: Basic {{api_key}}" \
     "{{host}}/v1/apps/{{org_id}}/insurance/collection-modules/{{cm_key}}/publish?bumpSandbox=false"
   ```

3. **Verify Rollback**
   - Check Root Platform shows correct version
   - Test functionality
   - Monitor logs

### Rollback Checklist

- [ ] Identify stable version to rollback to
- [ ] Notify stakeholders
- [ ] Execute rollback
- [ ] Verify functionality
- [ ] Document incident
- [ ] Fix issue in new version

---

## Monitoring After Deployment

### CloudWatch Logs

Root Platform automatically logs to CloudWatch:

**Access Logs:**
1. Root Platform Dashboard → Collection Modules → Your Module
2. Click "Logs" or "Monitoring"
3. View real-time logs
4. Filter by severity, time range, or search terms

**What to Monitor:**
- Error rates
- Response times
- Webhook processing
- API call success rates

### Alerting

Set up alerts for:
- High error rates
- Slow response times
- Failed webhook deliveries
- Missing configuration

### Health Checks

Monitor collection module health:
- Webhook delivery status
- API connectivity
- Processing latency
- Error patterns

---

## Troubleshooting

### Deployment Failed

**Symptoms:**
- API returns error
- Version not shown in dashboard
- Old version still running

**Solutions:**
1. Check API response for error details
2. Verify API key has correct permissions
3. Ensure organization ID and module key are correct
4. Check collection module code for errors
5. Review Root Platform status page

### Module Not Executing

**Symptoms:**
- Lifecycle hooks not called
- Webhooks not received
- No logs generated

**Solutions:**
1. Verify module is published and active
2. Check webhook URL is correct
3. Verify payment provider webhook configuration
4. Review logs for initialization errors
5. Test with sample events

### Configuration Issues

**Symptoms:**
- Missing environment variables
- API keys not working
- Wrong configuration values

**Solutions:**
1. Check Root Platform dashboard configuration
2. Verify environment variables are set correctly
3. Check for typos in API keys
4. Ensure correct environment (sandbox vs production)

---

## Best Practices

### Pre-Deployment

- ✅ Run full test suite (`npm test`)
- ✅ Validate configuration (`npm run validate`)
- ✅ Check code quality (`npm run lint`)
- ✅ Review code changes
- ✅ Update version number
- ✅ Update CHANGELOG.md
- ✅ Tag release in git

### During Deployment

- ✅ Deploy to sandbox first
- ✅ Test thoroughly in sandbox
- ✅ Monitor logs during deployment
- ✅ Verify webhook connectivity
- ✅ Have rollback plan ready

### Post-Deployment

- ✅ Verify version in dashboard
- ✅ Test critical workflows
- ✅ Monitor error rates
- ✅ Check log outputs
- ✅ Update documentation
- ✅ Notify team

### Security

- ✅ Never commit API keys or secrets
- ✅ Use Root Platform configuration for sensitive values
- ✅ Rotate API keys regularly
- ✅ Use different keys for sandbox/production
- ✅ Review permissions before deployment

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Configuration validated
- [ ] Documentation updated
- [ ] Version tagged in git
- [ ] CHANGELOG updated

### Sandbox Deployment
- [ ] Published to sandbox
- [ ] Tested lifecycle hooks
- [ ] Verified webhook processing
- [ ] Checked logs for errors
- [ ] Tested edge cases

### Production Deployment
- [ ] Sandbox testing complete
- [ ] Stakeholders notified
- [ ] Published to production
- [ ] Verified in dashboard
- [ ] Monitored initial traffic
- [ ] Documented deployment

### Post-Deployment
- [ ] Functionality verified
- [ ] Logs reviewed
- [ ] Metrics monitored
- [ ] Team notified
- [ ] Documentation updated

---

## Support

### Documentation

- **Setup**: [SETUP.md](./SETUP.md)
- **Customization**: [CUSTOMIZING.md](./CUSTOMIZING.md)
- **Webhooks**: [WEBHOOKS.md](./WEBHOOKS.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Testing**: [TESTING.md](./TESTING.md)

### Getting Help

1. Check Root Platform documentation
2. Review CloudWatch Logs
3. Check Root Platform status page
4. Contact Root Platform support

### Common Issues

| Issue | Solution |
|-------|----------|
| API key invalid | Verify key is correct for environment |
| Module not found | Check organization ID and module key |
| Permission denied | Verify API key has deployment permissions |
| Version conflict | Ensure version number is incremented |

---

## Next Steps

After deployment:

1. **Monitor Performance** - Watch logs and metrics
2. **Test End-to-End** - Process real transactions
3. **Document Changes** - Update runbooks and documentation
4. **Plan Next Release** - Gather feedback and plan improvements
5. **Set Up Webhooks** - See [WEBHOOKS.md](./WEBHOOKS.md)

---

**Ready to deploy! 🚀**
