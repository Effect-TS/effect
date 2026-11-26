---
"@effect/platform-node-shared": patch
---

Fix `NodeChildProcessSpawner` signaling the process group of an unref'ed child when it exits with a non-zero code or its scope closes. Previously, since `unref` was added in #1960, a non-zero exit still cleaned up the descendants of an unref'ed child. Call the `Reref` effect returned by `unref` to restore that cleanup.
