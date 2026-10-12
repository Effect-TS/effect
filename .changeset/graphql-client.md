---
"effect": patch
---

Add experimental `effect/graphql` with typed operations, middleware, HTTP and subscription transports, partial results, serializable errors and cursor pagination. HTTP response status and headers are exposed to middleware and kept on errors.

GraphQL errors keep unknown top-level fields, such as GitHub's `type`.

An operation's document can be given as a `GraphQL.DocumentTemplate`, which is joined into the same text and keeps the variable and fragment names a batch would rename.

GraphQL header options accept `Headers.Input`; middleware requests, transport responses and errors use normalized `Headers.Headers`. Error schemas encode headers as string records and restore header collections on decode.

`GraphQLResolver.ordered` and `findById` require a `batchKey` when the method needs services, such as a middleware's `requires`, so lookups with different services never share a call.
