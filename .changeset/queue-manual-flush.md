---
"effect": patch
---

Add `Queue.flush` and `Queue.flushUnsafe` for manually resuming fibers waiting on `Queue.await` without completing the queue.
