import { assert, it } from "@effect/vitest"
import { Graph } from "effect"
import { runInNewContext } from "node:vm"

// Graph.floydWarshall (packages/effect/src/Graph.ts:6443-6460) promises shortest paths for all pairs and allows
// negative finite weights. The only cycle here (0 -> 1 -> 0) costs exactly zero, so the 0 -> 2 path is [0, 2].
// Floating-point cancellation makes nextMatrix form a 0 <-> 1 cycle, and path reconstruction
// (Graph.ts:6604-6615) follows it forever. The vm timeout only bounds that synchronous hang.
it("floydWarshall terminates on a zero-cost cycle with floating-point cancellation", () => {
  const graph = Graph.directed<number, number>((mutable) => {
    for (let i = 0; i < 3; i++) Graph.addNode(mutable, i)
    Graph.addEdge(mutable, 0, 1, 0.1)
    Graph.addEdge(mutable, 1, 0, -0.1)
    Graph.addEdge(mutable, 0, 2, 0.01)
  })
  const result: Graph.AllPairsResult<number> = runInNewContext("Graph.floydWarshall(graph, (w) => w)", {
    Graph,
    graph
  }, { timeout: 1000 })
  assert.deepStrictEqual(result.paths.get(0)?.get(2), [0, 2])
})
