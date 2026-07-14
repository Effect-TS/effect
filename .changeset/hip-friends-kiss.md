---
"effect": minor
---

added graph set operations for combining and comparing graphs

- `Graph.compose` - union of two graphs, merging nodes by identity
- `Graph.intersection` - intersection of two graphs, keeping only common nodes and edges
- `Graph.difference` - difference of two graphs, removing edges present in the second graph
- `Graph.symmetricDifference` - symmetric difference of two graphs, keeping edges present in exactly one graph
