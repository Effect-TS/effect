---
"effect": patch
---

Fix `Pool` stranding waiters when `concurrency` is greater than one. A lease was
only returned to the availability list on the exact transition out of
saturation, so several leases released at once woke a single waiter and left the
rest asleep against an item that had room for them. Every release now admits one
waiter.
