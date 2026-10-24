---
"effect": patch
---

Fix `Equal.equals` and `Hash.hash` treating any two same-length `ArrayBuffer`s as equal. `ArrayBuffer` and `SharedArrayBuffer` are now compared and hashed by their bytes.
