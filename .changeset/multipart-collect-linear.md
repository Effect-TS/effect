---
"effect": patch
---

Fix quadratic buffering in `Multipart.collectUint8Array`, which made collecting streamed multipart file content with `contentEffect` up to two orders of magnitude slower than necessary for larger files.
