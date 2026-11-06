---
"@effect/platform-node-shared": patch
"@effect/platform-bun": patch
---

Fix interrupting a child process on Bun hanging when its `stdin` stream is backpressured because the child never reads it.
