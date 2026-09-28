---
"@effect/platform-node": patch
---

Close server-side WebSockets with a code that reflects how the socket run loop exited: 1000 on success, 1001 on interruption, and 1011 on failure.
