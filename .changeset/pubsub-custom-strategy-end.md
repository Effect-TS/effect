---
"effect": patch
---

Fix `PubSub.end` leaving backpressured publishers suspended with custom strategies or strategy subclasses. Pending publishes now complete with `false` after interruption cleanup.
