---
"effect": patch
---

Fix lost wake-ups in `Queue` when a fiber yields between checking for a message or capacity and registering its waiter.

`Queue.offer` on a zero-capacity `dropping` queue now hands the message to a waiting taker, matching `offerUnsafe` and `offerAll`.
