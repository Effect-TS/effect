---
"effect": patch
---

Fix `Stream.broadcastN` dropping the last element for a subscriber that keeps up while another lags beyond capacity. `PubSub.end` no longer drops a backpressured message that a waiting subscriber has not received yet.
