---
"effect": patch
---

`TxPriorityQueue.offerAll` merges the new values into the queue instead of sorting the queue and the new values together, and `offer` no longer copies the queue an extra time. `offerAll` of one value into a queue of 100,000 now runs 17 comparisons instead of 100,003, and `offer` allocates half as much. The resulting order is unchanged: existing elements still come before equal new ones, and new ones keep their input order.
