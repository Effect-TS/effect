---
"effect": patch
---

Release the replay buffer once a `PubSub` replay window is exhausted, so long-lived subscribers of a replay-enabled `PubSub` (e.g. `Stream.share({ replay })`) no longer retain every later message
