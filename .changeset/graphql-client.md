---
"effect": patch
---

Add the experimental `effect/graphql` module, a typed GraphQL client built from operation values and groups. It includes GraphQL-level middleware, an HTTP transport, graphql-ws and graphql-sse transports for subscriptions as `Stream`s, a serializable error model, partial results, cursor paging helpers, and the lenient `otherTypename` / `enumLiterals` decoding helpers used by code from `@effect/graphql-generator`.
