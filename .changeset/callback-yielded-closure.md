---
"effect": patch
---

Fix `Effect.callback` retaining completed suspension state, such as values received by `Deferred.await` or `PubSub.take`, until the next full GC.
