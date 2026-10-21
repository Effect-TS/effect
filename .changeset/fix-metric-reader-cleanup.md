---
"@effect/opentelemetry": patch
---

Shut down successfully bound metric readers when a later reader fails to bind, preventing exports from leaking after the failed scope closes.
