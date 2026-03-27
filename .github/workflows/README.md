# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Stripe Collection Module.

## Available Workflows

### CI Workflow (`ci.yml`)

**Triggers:**
- On push to `main`, `master`, or `develop` branches
- On pull requests to `main`, `master`, or `develop` branches

**What it does:**

#### Test & Lint Job
1. **Checkout** - Gets the code
2. **Setup Node.js** - Installs Node.js 18.x with npm caching
3. **Install** - Runs `npm ci` for clean dependency install
4. **Lint** - Runs ESLint to check code quality
5. **Test** - Runs Jest tests with coverage
6. **Upload Coverage** - Sends coverage to Codecov (optional)
7. **Check Thresholds** - Verifies 70% coverage threshold
8. **Comment PR** - Posts coverage report as PR comment

#### Build Job
1. **Checkout** - Gets the code
2. **Setup Node.js** - Installs Node.js 18.x
3. **Install** - Runs `npm ci`
4. **Build** - Compiles TypeScript to JavaScript
5. **Verify** - Checks that build artifacts were created

## Viewing Results

### On Pull Requests

When you create a PR, the CI workflow will:
1. ✅ Run all tests and show results
2. 📊 Post coverage report as a comment
3. 🔍 Run linter and flag issues
4. 🏗️ Verify the build succeeds

### Status Badges

Add to your README:

```markdown
[![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml)
```

## Local Testing

Before pushing, verify your changes locally:

```bash
cd collection_module

# Run linter
npm run lint

# Run tests with coverage
npm test -- --coverage

# Build
npm run build
```

## Configuration

### Node Version

The workflow uses Node.js 18.x to match the `.nvmrc` file.

### Coverage Thresholds

Tests must maintain 70% coverage across:
- Statements
- Branches
- Functions
- Lines

### Caching

The workflow caches npm dependencies for faster runs.

## Troubleshooting

### Failing Tests

If tests fail in CI but pass locally:
1. Check Node.js version matches (18.x)
2. Clear local `node_modules` and reinstall
3. Run `npm ci` instead of `npm install`
4. Check for environment-specific code

### Build Failures

If build fails:
1. Run `npm run build` locally
2. Check TypeScript errors
3. Verify all imports are correct
4. Check `tsconfig.json` configuration

### Coverage Failures

If coverage is below threshold:
1. Run `npm test -- --coverage` locally
2. Check which files need tests
3. Add tests to increase coverage
4. See `docs/TESTING.md` for testing guide

## Customization

### Adding More Jobs

To add a new job, edit `.github/workflows/ci.yml`:

```yaml
new_job_name:
  name: My New Job
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Do something
      run: echo "Hello"
```

### Changing Node Version

Update the matrix in `ci.yml`:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]  # Test multiple versions
```

### Optional: Codecov Integration

To enable Codecov coverage reports:
1. Sign up at https://codecov.io
2. Add your repository
3. No additional config needed - workflow already includes Codecov step

## Security

### Secrets

The workflow doesn't require secrets by default. If you add steps that need secrets:

1. Add secrets in GitHub repo settings
2. Reference in workflow:

```yaml
- name: Step using secret
  env:
    SECRET_NAME: ${{ secrets.SECRET_NAME }}
  run: some-command
```

### Permissions

The workflow has minimal permissions by default. It only needs:
- Read access to code
- Write access to comments (for coverage reporting)

## Best Practices

1. **Always run tests locally first**
2. **Keep CI fast** - Don't add unnecessary steps
3. **Fix failing tests immediately** - Don't merge with failing CI
4. **Review coverage reports** - Maintain high coverage
5. **Update workflows** - Keep actions up to date

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/)
- [Codecov Documentation](https://docs.codecov.com/)

