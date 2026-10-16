---
"effect": patch
"@effect/platform-browser": patch
---

Add the `Bytes` module with `concat`, `equals`, `Equivalence`, `Order`, `indexOf`, `startsWith`, and `endsWith` helpers for `Uint8Array` values, and use it in place of internal copies of the same helpers.

`Stream.mkUint8Array` now returns `Uint8Array<ArrayBuffer>`, matching `Channel.mkUint8Array`. `BrowserHttpClient` collects streamed request bodies with `Stream.mkUint8Array` instead of re-copying the buffer for every chunk.
