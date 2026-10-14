---
"@effect/cluster": patch
---

Persist outgoing messages for shards assigned to the local runner before their lock is acquired, instead of retrying forever with `EntityNotAssignedToRunner`.
