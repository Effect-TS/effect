---
"effect": patch
---

Add experimental `effect/graphql` with typed operations, middleware, HTTP and subscription transports, serializable errors, partial results and cursor pagination. The HTTP transport can send queries as `GET` (`queryMethod: "GET"`), applies per-call and middleware `urlParams`, and reports the HTTP status of a response with GraphQL `errors` as `ResponseError.status`.
