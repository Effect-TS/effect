---
"effect": patch
---

Fix Graph.neighbors() returning self-loops in undirected graphs.

Graph.neighbors() now correctly returns the other endpoint for undirected graphs instead of always returning edge.target, which caused nodes to appear as their own neighbors when queried from the target side of an edge.
