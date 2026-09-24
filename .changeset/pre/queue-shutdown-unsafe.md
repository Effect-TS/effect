---
"effect": patch
---

Add `Queue.shutdownUnsafe` to synchronously discard buffered messages and settle pending queue operations from callbacks. Both `Queue.shutdown` and `Queue.shutdownUnsafe` return `false` when the queue has already been shut down or completed; previously, `Queue.shutdown` always returned `true`.
