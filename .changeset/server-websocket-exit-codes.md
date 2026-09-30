---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-node": patch
---

Close server WebSockets with 1000 on success, 1001 on interruption, or 1011 on failure, while preserving explicit close codes. HTTP request scopes retain the handler's failure exit through response handling and middleware.
