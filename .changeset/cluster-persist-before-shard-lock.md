---
"@effect/cluster": patch
---

Persist an outgoing message to a shard that the ring assigns to this runner but whose lock is still being acquired, instead of retrying it indefinitely with `EntityNotAssignedToRunner`. The message is delivered once the lock is acquired. The closed-state guard and the ownership checks for incoming deliveries are unchanged.
