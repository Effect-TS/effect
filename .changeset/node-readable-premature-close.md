---
"@effect/platform-node-shared": patch
---

Fix NodeStream readable consumers hanging when a source is destroyed without an error before ending, including already-destroyed inputs. Premature closure now fails with `ERR_STREAM_PREMATURE_CLOSE` through `onError`, and consumer listeners are removed on completion, failure, or interruption, including when `emitClose` is disabled. Handle destruction errors during teardown without replacing the selected failure or interruption.
