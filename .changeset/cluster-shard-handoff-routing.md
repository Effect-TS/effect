---
"effect": patch
---

Fix cluster shard handoffs. Client interrupts and stream acks now reach requests still running on the previous owner while it drains. Volatile requests wait for the new owner to acquire the shard lock, bounded by `shardLockExpiration`, instead of repeatedly failing with `EntityNotAssignedToRunner`.
