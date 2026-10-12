---
"effect": patch
---

Add experimental `effect/graphql` with typed operations, middleware, HTTP and subscription transports, partial results, serializable errors and cursor pagination. Middleware and errors see the HTTP status and response headers, which `GraphQLClientError` exposes as `status` and `headers`. GraphQL errors keep unknown fields such as GitHub's `type`. `isRetryable` is true for 429 and 5xx responses and for any response with a `Retry-After` header, which is read as `retryAfter`.

Add `GraphQLResolver.ordered` and `findById` for batch lookups, and `aliased` to batch generated single-item operations from their document templates. When the method needs services, resolvers require a `batchKey`, so lookups with different services never share a request.
