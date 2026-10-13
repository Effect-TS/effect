---
"@effect/graphql-generator": patch
---

Add `@effect/graphql-generator` to generate typed `effect/graphql` operations from GraphQL documents and SDL or introspection schemas. Includes a programmatic API and the `graphqlgen` CLI with check and watch modes. Queries and mutations are emitted with their documents as `GraphQL.DocumentTemplate`s, which `GraphQLResolver.aliased` batches.
