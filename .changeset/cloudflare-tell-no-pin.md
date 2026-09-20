---
"@effect/platform-cloudflare": patch
---

Complete a persisted tell's invoke once the request is journaled and its handler forked, instead of pinning the caller until the handler finishes. Replayed tell rows no longer delay other callers' invoke results either; alarm re-arming and replay failure handling still await handler completion, and volatile tells keep their best-effort in-request execution.
