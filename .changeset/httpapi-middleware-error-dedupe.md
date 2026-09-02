---
"effect": patch
---

Fix `HttpApiMiddleware`-declared errors being duplicated and mis-encoded:

- `OpenApi.fromApi` emitted a duplicated `anyOf` for the middleware's status on every endpoint it was attached to, even when the middleware declared the same schema the endpoint already declared.
- A middleware error whose encoded form is not JSON-serializable (a `Schema.BigInt` field, for example) failed to encode with `Expected a JSON-serializable response body`.
