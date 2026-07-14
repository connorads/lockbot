import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // api and lock-bot tests share DynamoDB Local tables (:8000) and
    // serverless-offline (:3000); parallel files race on table recreation
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      // Files the in-process v8 provider cannot measure honestly; merged with
      // the provider defaults and applied after include. api.test.ts drives the
      // API routes over real HTTP against serverless-offline (:3000), a separate
      // process v8 can't instrument, so app.ts/middleware.ts would otherwise
      // report ~15% despite being thoroughly integration-tested.
      exclude: [
        "src/handlers/**/index.ts", // serverless-express shims (boundary glue)
        "src/handlers/slack/infra.ts", // OAuth install store, smoke-tested manually
        "src/handlers/api/app.ts", // routes integration-tested over HTTP (api.test.ts)
        "src/handlers/api/middleware.ts", // exercised via the same HTTP suite
      ],
    },
  },
});
