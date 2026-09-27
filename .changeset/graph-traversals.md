---
"effect": patch
---

Reduce allocations in `Graph` traversals: `neighbors` / `successors` / `predecessors` deduplicate without an intermediate `Set` for typical degrees, and `unweightedDistances`, `astar` and `allShortestPaths` no longer allocate a closure or predecessor record per visited node or relaxation.
