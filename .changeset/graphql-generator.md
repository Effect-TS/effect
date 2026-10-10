---
"@effect/graphql-generator": patch
---

Add the `@effect/graphql-generator` package, which generates typed `effect/graphql` operations and groups from `.graphql` documents and an SDL or introspection schema, without depending on graphql-js. Its `graphqlgen` CLI loads `graphql.config.ts` and writes, checks (`--check`), watches (`--watch`) and cleans up the generated `.graphql.ts` modules; `Generator.generate` is the programmatic core.
