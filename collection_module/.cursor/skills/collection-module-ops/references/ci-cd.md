# CI/CD (Reference)

GitHub Actions run on PRs and pushes to main/master/develop.

## Checks

- **Lint**: ESLint (workflow uses env from env.sample.ts).
- **Test**: Jest with coverage; threshold ≥70% (statements, branches, functions, lines).
- **Build**: TypeScript compile (type check).
- Coverage report posted as PR comment. All three must pass to merge.

## Workflow

File: `.github/workflows/ci.yml`. Jobs: lint, test, build. Node 18.x; `npm ci`; create code/env.ts from env.sample.ts for CI.

## Local pre-push

`npm run lint`, `npm run lint:fix`, `npm test`, `npm test -- --coverage`, `npm run build`.

## Debugging CI

- Tests pass locally but fail in CI: use `nvm use`, clean install, `npm test -- --ci`.
- Coverage below threshold: add tests; run `npm test -- --coverage --verbose`.
- Lint: run `npm run lint` / `npm run lint:fix` locally.
- Build: run `npm run build` for TypeScript errors.
- "Cannot find module '../env'": CI creates env.ts from env.sample.ts; ensure env.sample.ts exists and is valid.
- npm ci fails: update package-lock.json with `npm install` and commit.
