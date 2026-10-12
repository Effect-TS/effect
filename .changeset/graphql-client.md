---
"effect": patch
---

Add experimental `effect/graphql` with typed operations, middleware, HTTP and subscription transports, partial results, serializable errors and cursor pagination. HTTP response status and headers are exposed to middleware and kept on errors.

GraphQL errors keep unknown top-level fields, such as GitHub's `type`.
