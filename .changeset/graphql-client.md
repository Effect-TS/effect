---
"effect": patch
---

Add experimental `effect/graphql` with typed operations, middleware, HTTP and subscription transports, partial results, serializable errors and cursor pagination. HTTP supports GET queries, `urlParams` and response status in errors. `GraphQLClient.makeTest` and `layerTest` provide typed mocks. `GraphQLResolver.ordered` and `findById` batch lookups through client methods, matching results by position or key.
