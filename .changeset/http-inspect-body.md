---
"effect": patch
---

Logging an HTTP response no longer reads the body, so a streamed response stays readable.
