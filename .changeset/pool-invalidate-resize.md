---
"effect": patch
---

Fix `Pool` leaving waiters queued behind an invalidated item. Invalidating an
item that still has live leases removed it from circulation without topping the
pool back up, so anybody already waiting queued for an item that was never
coming back. The pool now resizes, since an invalidated item no longer counts
towards its active size.
