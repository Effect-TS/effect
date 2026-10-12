---
"effect": patch
---

Add experimental `effect/graphql` with typed operations, middleware, HTTP and subscription transports, partial results, serializable errors and cursor pagination.

GraphQL errors keep unknown top-level fields, such as GitHub's `type`.

An operation's document can be given as a `GraphQL.DocumentTemplate`, which is joined into the same text and keeps the variable and fragment names a batch would rename.
