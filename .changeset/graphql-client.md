---
"effect": patch
---

Add experimental `effect/graphql` with typed operations, middleware, HTTP and subscription transports, serializable errors, partial results and cursor pagination. The HTTP transport can send queries as `GET` (`queryMethod: "GET"`), applies per-call and middleware `urlParams`, and reports the HTTP status of a response with GraphQL `errors` as `ResponseError.status`. `GraphQLClient.makeTest` builds a typed mock client for tests from per-operation handlers. `GraphQLClient.layerTest(Service, group)(handlers)` wraps the mock in a service layer and can be bound as a static `Service.layerTest` helper. `GraphQLResolver.ordered` and `GraphQLResolver.findById` batch concurrent lookups through a client method into one `RequestResolver` call, matching results by position or by key.
