---
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Fix `FileSystem.watch` to prefer the caller-provided `FileSystem.WatchBackend`, falling back to the backend captured when the file system layer was built.
