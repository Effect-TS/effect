---
"@effect/platform-bun": patch
---

Close server WebSockets with code 1012 (Service Restart) instead of 1011 when the handler fiber is only interrupted.
