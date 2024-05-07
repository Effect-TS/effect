---
"@effect/platform-node": patch
---

Attempt to close a server only if `listen` succeeds. This fixes the error reporting in case a port is already in use.
