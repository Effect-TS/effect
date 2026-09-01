---
"effect": patch
---

Fix `HttpApiMiddleware` errors duplicating an endpoint's response schema

An endpoint stored its declared errors as response codecs (`transformResponseSchema`)
while a middleware stored the schemas it was given, raw. Everything downstream merges
the two sets by identity, so a middleware error could never match an endpoint error —
even when both sides declared the exact same schema.

Two consequences, both fixed:

- `OpenApi.fromApi` emitted `anyOf: [{ $ref: "#/components/schemas/Err" }, { $ref: "#/components/schemas/Err" }]`
  for the shared status on every endpoint the middleware was attached to.
- A middleware error whose encoded form is not JSON-serializable (a `Schema.BigInt`
  field, for example) failed to encode at runtime with
  `Expected a JSON-serializable response body`.

Middleware errors now go through the same response transform as endpoint errors, and
that transform is memoized on its input schema, so declaring one schema in both places
yields one instance. Middleware errors that are genuinely new for a status are still
documented, and two different schemas on one status still produce an `anyOf`.
