---
"@effect/platform-bun": patch
---

Close server WebSockets with code 1001 (Going Away) instead of 1011 when the handler fiber is only interrupted.
