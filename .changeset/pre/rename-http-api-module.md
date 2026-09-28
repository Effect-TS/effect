---
"effect": patch
---

Rename the HTTP API entry point from `effect/httpapi` to `effect/http-api` and remove the old export path. Runtime TypeIds under `~effect/httpapi/*`, service keys under `effect/httpapi/*`, and the reserved `effect/httpapi/stream/failure` SSE event name now use `http-api` as well.
