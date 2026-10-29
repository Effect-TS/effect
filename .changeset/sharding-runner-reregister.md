---
"effect": patch
---

Fix `Sharding` dropping a runner that re-registers at the same address with different shard groups or weight.

`Runner` equality and hashing now include the shard groups as a set. Newly healthy runners are added to the hash rings only after departed runners are removed, so a replacement at the same address is kept. A runner that leaves without ever being healthy is no longer removed from rings it was never added to.
