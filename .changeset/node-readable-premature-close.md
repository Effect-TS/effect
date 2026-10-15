---
"@effect/platform-node-shared": patch
---

Fix NodeStream readable consumers hanging on prematurely closed or already-destroyed streams by failing with `ERR_STREAM_PREMATURE_CLOSE`.
