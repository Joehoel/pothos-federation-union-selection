import SchemaBuilder from '@pothos/core'
import DirectivePlugin from '@pothos/plugin-directives'
import FederationPlugin from '@pothos/plugin-federation'
import type { SelectionFromShape } from '@pothos/plugin-federation'

const builder = new SchemaBuilder({
  plugins: [DirectivePlugin, FederationPlugin],
})

// Two value types that form a union. Both @shareable because the owning
// subgraph (see `src/schema.test.ts`) also defines them.
const Image = builder.objectRef<{ url: string }>('Image').implement({
  shareable: true,
  fields: (t) => ({ url: t.exposeString('url') }),
})

const Video = builder.objectRef<{ url: string }>('Video').implement({
  shareable: true,
  fields: (t) => ({ url: t.exposeString('url') }),
})

const Media = builder.unionType('Media', {
  types: [Image, Video],
  resolveType: () => 'Image',
})

// `Product` is owned by another subgraph and carries `media: [Media!]`.
// This subgraph contributes a computed `mediaUrls` field that @requires the
// urls, which live *inside* the union members — so the selection string MUST
// use inline fragments: `media { ... on Image { url } ... on Video { url } }`.
const Product = builder
  .externalRef(
    'Product',
    builder.selection<{ id: string }>('id'),
    (entity: { id: string }) => entity,
  )
  .implement({
    externalFields: (t) => ({
      media: t.field({ type: [Media], nullable: true }),
    }),
    fields: (t) => ({
      id: t.exposeID('id'),
      mediaUrls: t.field({
        type: ['String'],
        nullable: true,
        // ── THE GAP ────────────────────────────────────────────────────────
        // The honest, type-safe call would be:
        //
        //   requires: builder.selection<{ media: Array<{ url: string }> }>(
        //     'media { ... on Image { url } ... on Video { url } }',
        //   )
        //
        // but it does not compile: `SelectionFromShape<Shape>` has no branch
        // that emits `... on X`, so the inline-fragment string is not
        // assignable to the parameter type (see `src/type-checks.ts` for the
        // exact TS2345). The only way to make it compile is to cast the string
        // past the check — which discards the very type safety the API gives:
        requires: builder.selection<{ media: Array<{ url: string }> }>(
          'media { ... on Image { url } ... on Video { url } }' as unknown as SelectionFromShape<{
            media: Array<{ url: string }>
          }>,
        ),
        resolve: (source) => (source.media ?? []).map((m) => m.url),
      }),
    }),
  })

builder.queryType({
  fields: (t) => ({
    // A distinct field name so it doesn't collide with catalog's `product`.
    reviewedProduct: t.field({ type: Product, nullable: true, resolve: () => null }),
  }),
})

export const schema = builder.toSubGraphSchema({
  linkUrl: 'https://specs.apollo.dev/federation/v2.3',
})
