---
"effect": patch
---

Persist outgoing cluster messages while the locally assigned shard is waiting for its lock. Discard sends now return after persistence, and requests await their replies through storage without delivering to the entity before lock acquisition. This also prevents these discard sends from blocking shard release during rebalance.
