import { defineConfig } from 'vitest/config'

// Keep node_modules externalized so there is a single `graphql` realm (the
// schema Pothos builds is the one @apollo/subgraph reads). `@pothos/plugin-
// federation@4` ships an extensionless deep-import of `@apollo/subgraph/dist/
// types` that Node's ESM resolver rejects; a one-line pnpm patch adds the `.js`
// extension (see package.json > pnpm.patchedDependencies). Unrelated to the bug.
export default defineConfig({
  resolve: { dedupe: ['graphql'] },
  test: { globals: true, include: ['src/**/*.test.ts'] },
})
