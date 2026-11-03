---
"@effect/platform-node-shared": patch
---

Fix `NodeStream.toArrayBuffer` and `toUint8Array` crashing on string chunks and enforce their encoded byte limits.
