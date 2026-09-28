---
"@effect/platform-node": patch
---

Close server-side WebSockets with a code that reflects the handler exit: 1000 on success, 1001 on interruption, and 1011 on failure.
