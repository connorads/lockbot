// Biome is the formatter and main linter; ESLint runs only the type-aware
// rules Biome cannot implement.
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["coverage/", ".esbuild/", ".serverless/", ".dynamodb/"],
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts", "*.config.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // load-bearing on the Destination switch in handle-command.ts
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
);
