---
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Use a `FileSystem.WatchBackend` from the calling context when the file system layer was built without one, so `fs.watch` no longer silently falls back to the native watcher because of layer ordering.
