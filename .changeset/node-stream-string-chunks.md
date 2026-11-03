---
"@effect/platform-node-shared": patch
---

Fix `NodeStream.toArrayBuffer` and `toUint8Array` throwing on string chunks by encoding them with the stream's encoding, or UTF-8 when none is set.
