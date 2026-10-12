---
"effect": patch
---

Add experimental `effect/graphql` with typed operations, middleware, HTTP and subscription transports, partial results, serializable errors and cursor pagination.

GraphQL errors keep unknown top-level fields, such as GitHub's `type`.

Expose HTTP response headers to GraphQL middleware and preserve them in serializable response and transport errors, including graphql-sse responses.
