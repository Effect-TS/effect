---
"effect": patch
---

Add experimental Graph module with comprehensive graph data structure support

This experimental module provides:
- Directed and undirected graph support
- Immutable and mutable graph variants  
- Type-safe node and edge operations
- Graph algorithms: DFS, BFS, shortest paths, cycle detection, etc.

Example usage:
```typescript
import { Graph } from "effect"

// Create a graph with mutations
const graph = Graph.directed<string, number>((mutable) => {
  const nodeA = Graph.addNode(mutable, "Node A")
  const nodeB = Graph.addNode(mutable, "Node B")
  Graph.addEdge(mutable, nodeA, nodeB, 5)
})

console.log(`Nodes: ${Graph.nodeCount(graph)}, Edges: ${Graph.edgeCount(graph)}`)
```