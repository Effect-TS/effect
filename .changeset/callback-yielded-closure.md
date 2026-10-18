---
"effect": patch
---

Fix `Effect.callback` keeping state from completed suspensions, such as the value received by `Deferred.await`, `PubSub.take` or `SubscriptionRef.changes`, alive until the next full garbage collection.
