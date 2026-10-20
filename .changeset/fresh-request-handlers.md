---
"effect": patch
---

Pre-response handlers and `HttpMiddleware.withLoggerDisabled` now apply to exactly one server request. `HttpApiTest` no longer accumulates handlers across retry attempts that reuse the same client request. `HttpEffect.appendPreResponseHandlerUnsafe` now takes the fiber context instead of the request.
