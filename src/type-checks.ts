import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'

const builder = new SchemaBuilder({ plugins: [FederationPlugin] })

// (A) A NON-union selection is genuinely type-checked. A wrong field name is a
//     compile error. This is the safety the API is designed to give.
builder.selection<{ id: string; name: string }>('id name') // ok

// @ts-expect-error TS2345: 'id nam' is not assignable to SelectionFromShape<...>
builder.selection<{ id: string; name: string }>('id nam') // typo -> rejected

// (B) A selection that must traverse a UNION cannot be expressed at all.
//     GraphQL requires `media { ... on Image { url } }`, but there is no branch
//     in SelectionFromShape that emits `... on X`. Instead it recurses into the
//     member shape as if it were a plain object and expects the literal
//     `"media { url }"`, which selects `url` directly on a union and is itself
//     invalid GraphQL, while the only VALID string is rejected. There is no un-cast
//     spelling that compiles.
// @ts-expect-error TS2345: 'media { ... on Image { url } }' is not assignable to '"media { url }"'
builder.selection<{ media: Array<{ url: string }> }>('media { ... on Image { url } }')
