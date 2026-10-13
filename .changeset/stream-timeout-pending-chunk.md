---
"effect": patch
---

Fix `Stream.timeout` and `Stream.timeoutOrElse` hanging when an async iterator's pending `next()` never settles.
