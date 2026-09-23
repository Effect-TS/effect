---
"effect": patch
---

Fix `Queue.take`, `takeN`, `takeBetween`, `takeAll`, `peek`, `offer` and `offerAll` parking forever when a fiber yields between checking the queue and registering its waiter. A taker could park beside a non-empty queue, an offer beside free capacity, and a zero-capacity queue could deadlock on both sides. Checking and registering now happen in one callback, so the fast path is the first step of the general wait rather than a second path that can miss a wake-up.
