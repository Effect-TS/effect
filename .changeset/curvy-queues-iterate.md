---
"effect": patch
---

`TxPriorityQueue.fromIterable(order)(iterable)` passed its arguments to the implementation in the wrong order and produced a queue of `undefined` values; the data-first form was unaffected.
