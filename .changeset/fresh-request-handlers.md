---
"effect": patch
---

Scope pre-response handlers and `HttpMiddleware.withLoggerDisabled` to a single server request instead of keying them by `request.source`. `HttpApiTest` no longer accumulates handlers across retry attempts that reuse the same client request. `HttpEffect.appendPreResponseHandlerUnsafe` now takes the fiber context instead of the request.
