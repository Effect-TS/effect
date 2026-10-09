---
"effect": patch
---

Fix cluster shard handoffs. Interrupts and stream acknowledgements now reach requests still draining on the previous owner, and `RpcServer` accepts acknowledgements for active streams after a client's EOF. Volatile requests sent during a handoff wait, for at most `shardLockExpiration`, until the shard can be served instead of repeatedly failing with `EntityNotAssignedToRunner`.
