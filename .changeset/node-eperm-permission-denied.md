---
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Map `EPERM` errno to `PermissionDenied` in Node and Deno platform error handlers, consistent with the DatagramSocket handler.
