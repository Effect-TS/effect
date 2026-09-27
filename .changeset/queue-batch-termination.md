---
"effect": patch
---

Drain remaining messages in batch takes when a queue is closing, even if fewer than the requested minimum remain. Subsequent takes receive the queue terminal error once it is done, including when a batch taker was already waiting at termination.
