---
"effect": patch
---

Fix `PubSub.end` dropping a backpressured message for a waiting subscriber when the resumed publisher ends the `PubSub`, which made `Stream.broadcastN` lose the last element on a subscriber that keeps up while another lags.
