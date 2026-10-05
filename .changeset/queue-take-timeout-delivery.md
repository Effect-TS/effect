---
"effect": patch
---

Prevent `Queue.take` from losing a dequeued message when a scheduler yield lets its timeout win before the take delivers its result.
