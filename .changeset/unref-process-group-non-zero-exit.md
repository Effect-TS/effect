---
"@effect/platform-node-shared": patch
---

Fix `NodeChildProcessSpawner` signaling an unref'ed child's process group when the child exits non-zero or its scope closes. This reverses the cleanup added with `unref` in #1960; run the returned `Reref` to restore it.
