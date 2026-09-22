---
"effect": patch
---

Fix `Layer` memoization losing track of a shared build when a requester is interrupted:

- a build interrupted before it started left an entry that never completes, so a requester already waiting on that layer, and every later build of it on the same memo map, hung forever;
- an interrupted reuse kept the shared layer alive after every scope that used it had closed, whether the reusing scope was open or already closed;
- running a `MemoMap.get` effect twice released the shared layer while it was still in use, and a `MemoMap.get` effect that was never run kept it alive.
