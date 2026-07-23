# Pothos federation: `SelectionFromShape` can't express inline fragments

Minimal, self-contained reproduction for a type gap in
[`@pothos/plugin-federation`](https://www.npmjs.com/package/@pothos/plugin-federation).

`builder.selection` / `SelectionFromShape<Shape>` can only generate selection
strings of scalar fields and nested object fields. It has no branch that emits
an inline fragment (`... on Type { ... }`). But GraphQL requires an inline
fragment the moment a `@requires` / `@provides` / `@key` field set selects
through a union or interface field. So there's no way to type such a selection
without casting the string past the check, which discards the type safety the
API is meant to provide.

## Run it

```sh
pnpm install
pnpm check-types   # tsc: passes, because the two @ts-expect-error assertions in src/type-checks.ts hold
pnpm test          # vitest: the cast workaround produces SDL that composes cleanly
```

## What each file shows

- `src/type-checks.ts`: the crux. `builder.selection` genuinely type-checks a
  non-union selection (a typo is a real `TS2345`), but the valid union string
  `'media { ... on Image { url } }'` is rejected. The type expects the literal
  `"media { url }"`, which selects `url` directly on a union and is itself
  invalid GraphQL, because `SelectionFromShape` recurses into the union member
  as if it were a plain object.

- `src/schema.ts`: a realistic subgraph. `Product` (owned elsewhere) has a
  union-typed `media: [Media!]`; this subgraph adds a computed `mediaUrls` that
  `@requires(fields: "media { ... on Image { url } ... on Video { url } }")`.
  Because the honest call does not compile, the selection string is cast past
  `SelectionFromShape`, disabling the check.

- `src/schema.test.ts`: proves the SDL the cast produces is legitimate. The
  field set is emitted verbatim and `@apollo/composition` composes the two
  subgraphs with zero errors. Only the type layer can't express it.

## Versions

Pinned in `package.json`: `@pothos/plugin-federation` 4.4.3 (current latest),
`@pothos/core` 4.13.1, `graphql` 16.13.2, `@apollo/composition` /
`@apollo/subgraph` 2.14.0, TypeScript 7.0.2.
