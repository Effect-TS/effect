---
"effect": patch
---

Fix `HttpClient` sending invalid trace headers when tracing is disabled with `Effect.withTracerEnabled(false)`.
