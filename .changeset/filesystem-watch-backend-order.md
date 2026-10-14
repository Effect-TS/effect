---
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Fix `FileSystem.watch` ignoring a `FileSystem.WatchBackend` provided after the file system layer was built without one.
