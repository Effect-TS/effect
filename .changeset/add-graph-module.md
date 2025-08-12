---
"effect": patch
---

Add comprehensive Graph module with directed and undirected graph support

The Graph module provides:
- Support for both directed and undirected graphs
- Immutable and mutable graph variants
- Type-safe node and edge operations with generic data types
- Graph algorithms:
  - Traversal: DFS, BFS, topological sort, post-order DFS
  - Shortest path: Dijkstra, A*, Bellman-Ford, Floyd-Warshall
  - Analysis: cycle detection, bipartite detection, connected components, strongly connected components
  - Export: GraphViz DOT format support

Example usage:
```typescript
import { Graph } from "effect"

// Create a directed graph
const graph = Graph.directed<string, number>()
  .addNode("A", "Node A")
  .addNode("B", "Node B")
  .addNode("C", "Node C")
  .addEdge("A", "B", 1)
  .addEdge("B", "C", 2)

// Find shortest path
const path = Graph.dijkstra(graph, "A", "C", (edge) => edge)
```