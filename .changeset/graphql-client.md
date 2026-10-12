---
"effect": patch
---

Add experimental `effect/graphql` with typed operations, middleware, HTTP and subscription transports, partial results, serializable errors and cursor pagination. Middleware and errors see the HTTP status and response headers, GraphQL errors keep unknown fields such as GitHub's `type`, and `isRetryable` is true for 429 and 5xx responses, with `retryAfter` read from `Retry-After`.

Add `GraphQLResolver.ordered` and `findById` for batch lookups, and `aliased` to batch generated single-item operations from their document templates. When the method needs services, resolvers require a `batchKey`, so lookups with different services never share a request.
