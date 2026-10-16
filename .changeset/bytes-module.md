---
"effect": minor
"@effect/platform-browser": patch
---

Add the unstable `Bytes` module with `concat`, `Equivalence`, and `Order` for `Uint8Array` values. `Stream.mkUint8Array` now returns `Uint8Array<ArrayBuffer>`. Browser HTTP clients collect streamed request bodies without repeatedly copying accumulated bytes.
