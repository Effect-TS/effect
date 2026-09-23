---
"effect": patch
---

Replace the maps on `Graph.floydWarshall`'s result with `distance` and `path` lookups. `path` returns the same `PathResult` as the other shortest-path algorithms, or `Option.none()` when the target is unreachable.
