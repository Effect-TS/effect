---
"@effect/platform": patch
---

Fix `HttpServerError.causeResponse` to prefer 499 when a client abort interrupt is present.
