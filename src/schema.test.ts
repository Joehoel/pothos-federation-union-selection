import { describe, it, expect } from 'vitest'
import { printSubgraphSchema } from '@apollo/subgraph'
import { composeServices } from '@apollo/composition'
import gql from 'graphql-tag'
import { schema } from './schema'

const reproSdl = printSubgraphSchema(schema)

// The subgraph that owns Product + the union value types.
const catalogSdl = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable"])

  type Query {
    product(id: ID!): Product
  }

  type Product @key(fields: "id") {
    id: ID!
    media: [Media!]
  }

  union Media = Image | Video

  type Image @shareable {
    url: String!
  }

  type Video @shareable {
    url: String!
  }
`

describe('union @requires selection', () => {
  it('emits the inline-fragment @requires verbatim in the subgraph SDL', () => {
    expect(reproSdl).toContain(
      '@requires(fields: "media { ... on Image { url } ... on Video { url } }")',
    )
  })

  it('composes cleanly with the owning subgraph (the SDL is valid Federation 2)', () => {
    const result = composeServices([
      { name: 'catalog', typeDefs: catalogSdl },
      { name: 'reviews', typeDefs: gql(reproSdl) },
    ])
    const errors = (result.errors ?? []).map((e) => e.message)
    expect(errors).toEqual([])
    expect(result.supergraphSdl).toBeDefined()
  })
})
