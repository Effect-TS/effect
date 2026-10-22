---
"effect": patch
---

Fix `Equal.equals` treating any two same-length `ArrayBuffer`s as equal; `ArrayBuffer` and `SharedArrayBuffer` now compare and hash by their bytes.
