---
"effect": patch
---

Add `Queue.shutdownUnsafe` to synchronously discard buffered messages and settle pending queue operations from callbacks. `Queue.shutdown` retains its existing behavior.
