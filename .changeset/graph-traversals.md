---
"effect": patch
---

`Graph`'s traversals no longer allocate per visit or per relaxation. The breadth-first, depth-first, distance, A* and minimum-spanning-forest routines built a closure for every dequeued node, a predecessor record for every relaxation that improved nothing, and a `Set` to deduplicate neighbours that the traversal already tracked. A closure belongs to a traversal, not to a visit.
