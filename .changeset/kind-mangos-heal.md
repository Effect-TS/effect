---
"effect": patch
---

Fix `Stream.decodeText` to correctly handle multi-byte UTF-8 characters split across chunk boundaries.
