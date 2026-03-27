# CI/CD Setup

This document explains the Continuous Integration and Continuous Deployment (CI/CD) setup for the Stripe Collection Module.

## Overview

The project uses **GitHub Actions** for automated testing and quality checks on every pull request and push to main branches.

## What Gets Tested

### On Every Pull Request

When you create or update a pull request, GitHub Actions automatically:

1. ✅ **Runs all tests**
2. 📊 **Checks code coverage** (must be ≥70%)
3. 🔍 **Runs linter** (ESLint)
4. 🏗️ **Verifies build** (TypeScript compilation)
5. 💬 **Posts coverage report** as PR comment

### Status Checks

Pull requests show three independent status checks:
- ✅ **Lint** - ESLint passes with no errors
- ✅ **Test** - All tests pass with 70%+ coverage
- ✅ **Build Check** - TypeScript compiles successfully

**You cannot merge** until all checks pass.

## CI Workflow Details

### Workflow File

`.github/workflows/ci.yml`

### Triggers

- **Push** to `main`, `master`, or `develop`
- **Pull requests** to `main`, `master`, or `develop`

### Jobs

#### 1. Lint Job

```yaml
- Checkout code
- Setup Node.js 18.x
- Install dependencies (npm ci)
- Create env.ts from env.sample.ts
- Run ESLint
```

#### 2. Test Job

```yaml
- Checkout code
- Setup Node.js 18.x
- Install dependencies (npm ci)
- Create env.ts from env.sample.ts
- Run Jest tests with coverage (275+ tests)
- Comment coverage report on PR
```

#### 3. Build Job

```yaml
- Checkout code
- Setup Node.js 18.x
- Install dependencies (npm ci)
- Create env.ts from env.sample.ts
- Build TypeScript (type checking only - noEmit: true)
```

## Coverage Requirements

All code must maintain **70% coverage** across:

| Metric | Threshold |
|--------|-----------|
| Statements | 70% |
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |

## Viewing CI Results

### 1. Pull Request Page

Check the **Checks** tab on your PR to see:
- Test results
- Linting results
- Build status
- Coverage report (posted as comment)

### 2. Actions Tab

Visit the **Actions** tab in GitHub to:
- View detailed logs
- Re-run failed workflows
- See all workflow runs

## Local Pre-Push Checklist

Before pushing code, run locally:

```bash
cd collection_module

# 1. Run linter
npm run lint

# 2. Fix linting issues
npm run lint:fix

# 3. Run all tests
npm test

# 4. Check coverage
npm test -- --coverage

# 5. Build
npm run build
```

**If all pass locally, CI should pass too!**

## Debugging Failed CI

### Tests Fail in CI but Pass Locally

**Causes:**
- Different Node.js version
- Cached dependencies
- Environment-specific code

**Solutions:**
```bash
# Use correct Node version
nvm use

# Clean install
rm -rf node_modules package-lock.json
npm install

# Run with CI flag
npm test -- --ci
```

### Coverage Below Threshold

**Check what needs testing:**
```bash
npm test -- --coverage --verbose
```

**Add tests for uncovered files** - see [TESTING.md](./TESTING.md)

### Linter Failures

**Run locally:**
```bash
npm run lint
```

**Auto-fix:**
```bash
npm run lint:fix
```

### Build Failures

**Check TypeScript errors:**
```bash
npm run build
```

## Coverage Reports

### On Pull Requests

The CI automatically posts a coverage report comment:

```
📊 Test Coverage Report

| Category | Coverage |
|----------|----------|
| Statements | 92.91% |
| Branches | 84.77% |
| Functions | 95.38% |
| Lines | 93.49% |

✅ Coverage threshold: 70%
```

## Pull Request Template

The project includes a PR template that prompts you to:

- Describe changes
- Verify testing
- Update documentation
- Complete checklist

**Use the template** to ensure quality submissions.

## Best Practices

### ✅ DO

- Run tests locally before pushing
- Fix failing CI immediately
- Maintain high test coverage
- Write meaningful commit messages
- Keep PRs focused and small

### ❌ DON'T

- Commit with failing tests
- Skip linting errors
- Merge with failing CI
- Commit without testing
- Disable coverage checks

## Troubleshooting

### "Cannot find module '../env'" Error

**Cause:** The `code/env.ts` file is gitignored and not in the repository.

**Solution:** The CI workflow automatically creates `code/env.ts` from `code/env.sample.ts` before building. If this step fails, check that `env.sample.ts` exists and is valid.

**Why this happens:** Environment files contain secrets and should never be committed. The CI uses the sample file as a placeholder for compilation.

### "npm ci" Fails

**Cause:** Outdated package-lock.json

**Fix:**
```bash
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
```

### Cache Issues

**Clear GitHub Actions cache:**
1. Go to **Actions** tab
2. Click **Caches**
3. Delete relevant caches
4. Re-run workflow

### Permissions Error

**Ensure GitHub Actions is enabled:**
1. Go to **Settings** → **Actions** → **General**
2. Enable "Allow all actions"
3. Enable "Read and write permissions"

## Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Jest CI Configuration](https://jestjs.io/docs/configuration#ci-boolean)
- [Node.js Action](https://github.com/actions/setup-node)

