---
"effect": patch
---

Fix replay-enabled `PubSub` and `SubscriptionRef` keeping values that left the replay buffer alive until the next full garbage collection.
