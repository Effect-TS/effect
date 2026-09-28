---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-node": patch
---

Server WebSockets now close with code 1000 after success, 1001 after interruption, and 1011 after failure. Explicit close codes set by the handler are preserved. `HttpEffect.scopeHandlerCause` exposes the cause a request handler failed with to request scope finalizers.
