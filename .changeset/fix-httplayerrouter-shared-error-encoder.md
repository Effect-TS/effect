---
"@effect/platform": patch
---

Fix `HttpLayerRouter.addHttpApi` so two registered APIs no longer share error encoders. Previously each call's middleware was added to a shared context map and applied to every route, so a 500 response from one API was sometimes encoded against the other API's error schema. The fix scopes each API's middleware to its own endpoints (matched by method + path) and wraps each route handler directly.
