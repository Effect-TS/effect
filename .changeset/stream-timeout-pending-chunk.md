---
"effect": patch
---

End `Stream.timeout` when the next chunk stays pending, including a `Readable` that never closes.
