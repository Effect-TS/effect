---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add `HttpServerRequest.RequestToken`, a per-request identity that `modify()` and body wrappers preserve. Pre-response handlers and logger-disabled state are keyed by it instead of `source`, so `HttpApiTest` no longer accumulates handlers across retry attempts that reuse the same client request.
