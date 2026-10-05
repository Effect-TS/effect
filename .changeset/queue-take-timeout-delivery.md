---
"effect": patch
---

Prevent `Queue.take`, `takeAll`, `takeN`, `takeBetween`, `poll`, and `clear` from losing dequeued messages when the fiber is interrupted during a scheduler yield before the result is delivered.
