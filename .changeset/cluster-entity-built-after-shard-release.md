---
"effect": patch
---

Stop registering an entity whose construction finishes after its shard was released, so the runner that gave up the shard no longer serves it. Pending requests are retried on the new owner.
