---
"effect": patch
---

Withdraw pending `Queue.offer` and `Queue.offerAll` values when their producer is interrupted after `Queue.end` or `Queue.fail`. The queue can finish closing once those offers are withdrawn.
