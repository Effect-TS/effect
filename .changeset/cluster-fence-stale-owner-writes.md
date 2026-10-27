---
"effect": patch
---

Stop a runner that lost a shard lock from storing the final reply of a persisted request on that shard. Before storing it, the runner refreshes its shard locks and checks that the shard is still among them. If it is not, the request is left for the shard's new owner.
