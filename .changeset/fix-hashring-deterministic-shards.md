---
"effect": patch
---

Fix `HashRing.getShards` returning different shard assignments for the same nodes and weights after different add/remove histories. Sum weights in node-key order and break hash ties by node key. Assignments may change for fractional weights or hash ties.
