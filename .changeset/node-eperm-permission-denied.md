---
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Classify `EPERM` errors as `PermissionDenied` instead of `Unknown` in Node and Deno platform error handlers.
