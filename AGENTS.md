# AGENTS.md

Lockbot is a Slack mutex bot (live at [lockbot.app](https://lockbot.app)):
`/lock`, `/unlock`, `/locks`, `/lbtoken` plus an HTTP API for locks.

## Stack

- TypeScript 6, Node 22 (Lambda runtime `nodejs22.x`)
- osls v4 (MIT fork of Serverless Framework v3) + serverless-esbuild;
  deploys in place to the original CloudFormation stack
- AWS SDK v3 (`@aws-sdk/lib-dynamodb`), Bolt 4 + Express 5,
  `@codegenie/serverless-express`
- io-ts/fp-ts for API request validation - the decoder error strings are
  asserted verbatim in tests; do not swap the validation library casually
- Vitest; Biome 2 (format + main lint); ESLint runs only type-aware rules
  (`switch-exhaustiveness-check`, `no-floating-promises`)
- pnpm 11 (default isolated node linker; build scripts blocked except esbuild)

## Architecture

Ports and adapters: `LockBot` (src/lock-bot.ts) and `TokenAuthorizer` are the
functional core, with `LockRepo`/`AccessTokenRepo` ports. Each port has an
in-memory and a DynamoDB adapter; the contract tests in `test/` run against
both. Handlers under `src/handlers/{slack,api,swagger}` are thin Express apps
wrapped by serverless-express. The Slack OAuth installation store lives inline
in `src/handlers/slack/infra.ts` and has no automated test coverage - smoke
test installs manually after deploys that touch it.

## Commands

```bash
mise install          # toolchain (node, pnpm, java, hk, pkl)
pnpm install          # dependencies
pnpm db:install       # one-time DynamoDB Local download
pnpm db:start         # DynamoDB Local on :8000
pnpm dev              # serverless-offline on :3000 (dummy Slack secrets)
pnpm test             # vitest (needs :8000 and :3000 running)
pnpm run ci           # orchestrates offline + tests, as CI runs them
pnpm lint             # tsc + biome + eslint + redocly, in parallel
pnpm format           # biome check --write
hk install            # git pre-commit hooks (mirror of pnpm lint)
```

## Test topology

The suite talks to real local infrastructure, serially:

- DynamoDB Local on **:8000** (Java): tables are dropped and recreated in
  `beforeEach` (test/utils.ts)
- serverless-offline on **:3000**: `test/api.test.ts` is a black-box
  supertest suite over real HTTP against tables named `dev-lockbot-*`
- Files must not run in parallel (`fileParallelism: false` in
  vitest.config.ts) - parallel files race on table recreation

## Deploys

- PR to master -> `deploy-dev` (gated by the `dev` GitHub environment)
- Push to master -> `deploy-prod` (gated by the `prod` environment)
- The three DynamoDB tables (`{stage}-lockbot-resources`, `-installations`,
  `-tokens`) hold irreplaceable OAuth installs and token hashes. Any change
  to `serverless.yml` must keep their CloudFormation logical IDs
  (`resourcesTable`, `installationsTable`, `accessTokensTable`) and
  properties stable: verify with `sls package` and diff
  `.serverless/cloudformation-template-update-stack.json` - tables and
  `ApiGatewayRestApi` must show UPDATE or no change, never REPLACE/DELETE.
- The lockbot.app domain -> API Gateway mapping is managed outside this repo.
