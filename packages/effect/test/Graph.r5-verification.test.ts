import { assert, describe, it, type TaskMeta } from "@effect/vitest"
import { Graph, Option } from "effect"

declare module "vitest" {
  interface TaskMeta {
    r5Graph?: Array<unknown>
  }
}

type Edge = { readonly id: number; readonly weight: number }
type Link = readonly [number, number, number]

const make = (kind: Graph.Kind, links: ReadonlyArray<Link>) =>
  Graph.make(kind)<string, Edge>((mutable) => {
    for (const name of ["source", "a", "b", "target"]) Graph.addNode(mutable, name)
    links.forEach(([source, target, weight], id) => Graph.addEdge(mutable, source, target, { id, weight }))
  })
const cycle: ReadonlyArray<Link> = [[0, 1, 1], [1, 2, -2], [2, 1, 1]]
const direct: Link = [0, 3, 5]
const path5 = (edge: number) => ({
  _tag: "Some",
  value: { path: [0, 3], edges: [edge], distance: 5, costs: [{ id: edge, weight: 5 }] }
})
const none = { _tag: "None" }
const negative = (target = 3) => ({ error: "Negative cycle affects path to node " + target })

const query = <T extends Graph.Kind>(
  meta: TaskMeta,
  id: string,
  graph: Graph.Graph<string, Edge, T> | Graph.MutableGraph<string, Edge, T>,
  target = 3,
  dataLast = false,
  replaceWeight?: (edge: Edge) => number
) => {
  const calls: Array<number> = []
  const config = {
    source: 0,
    target,
    cost: (edge: Edge) => {
      calls.push(edge.id)
      return replaceWeight ? replaceWeight(edge) : edge.weight
    }
  }
  let outcome: unknown
  try {
    const result = dataLast ? Graph.bellmanFord(config)(graph) : Graph.bellmanFord(graph, config)
    outcome = Option.isSome(result) ? { _tag: "Some", value: result.value } : none
  } catch (error) {
    outcome = error instanceof Graph.GraphError ? { error: error.message } : { unexpected: String(error) }
  }
  const edgeIds = Graph.toSnapshot(graph).edges.map((edge) => edge.data.id)
  const records = meta.r5Graph ??= []
  records.push({ id, kind: graph.type, mutable: graph.mutable, target, edgeIds, calls, outcome })
  assert.deepStrictEqual(calls, edgeIds, "cost callback exactly once per stored edge per query")
  return outcome
}

describe("R5 Bellman-Ford propagation", () => {
  const cases: ReadonlyArray<{
    id: string
    kind: Graph.Kind
    links: ReadonlyArray<Link>
    expected: unknown
    target?: number
  }> = [
    { id: "G01-infinity-bridge", kind: "directed", links: [...cycle, direct, [2, 3, Infinity]], expected: path5(3) },
    { id: "G02-no-bridge", kind: "directed", links: [...cycle, direct], expected: path5(3) },
    { id: "G03-finite-bridge", kind: "directed", links: [...cycle, direct, [2, 3, 1]], expected: negative() },
    { id: "G04-target-infinity-only", kind: "directed", links: [...cycle, [2, 3, Infinity]], expected: none },
    {
      id: "G05-parallel-infinity-first",
      kind: "directed",
      links: [...cycle, direct, [2, 3, Infinity], [2, 3, 1]],
      expected: negative()
    },
    {
      id: "G06-parallel-finite-first",
      kind: "directed",
      links: [...cycle, direct, [2, 3, 1], [2, 3, Infinity]],
      expected: negative()
    },
    {
      id: "G07-unreachable-cycle",
      kind: "directed",
      links: [[1, 2, -2], [2, 1, 1], direct, [2, 3, 1]],
      expected: path5(2)
    },
    {
      id: "G08-infinity-isolates-cycle",
      kind: "directed",
      links: [[0, 1, Infinity], [1, 2, -2], [2, 1, 1], direct, [2, 3, 1]],
      expected: path5(3)
    },
    { id: "G09-target-in-cycle", kind: "directed", links: cycle, target: 1, expected: negative(1) },
    { id: "G10-source-negative-self-loop", kind: "directed", links: [[0, 0, -1]], target: 0, expected: negative(0) },
    {
      id: "G11-self-loop-infinity-bridge",
      kind: "directed",
      links: [[0, 1, 1], [1, 1, -1], direct, [1, 3, Infinity]],
      expected: path5(2)
    },
    {
      id: "G12-undirected-connected-target",
      kind: "undirected",
      links: [[0, 1, 1], [1, 2, -1], direct, [2, 3, Infinity]],
      expected: negative()
    },
    {
      id: "G13-undirected-infinity-only",
      kind: "undirected",
      links: [[0, 1, 1], [1, 2, -1], [2, 3, Infinity]],
      expected: none
    },
    {
      id: "G14-undirected-finite-bridge",
      kind: "undirected",
      links: [[0, 1, 1], [1, 2, -1], [2, 3, 1]],
      expected: negative()
    },
    {
      id: "G15-undirected-parallel-bridge",
      kind: "undirected",
      links: [[0, 1, 1], [1, 2, -1], [3, 2, Infinity], [3, 2, 1]],
      expected: negative()
    },
    {
      id: "G16-undirected-unreachable-cycle",
      kind: "undirected",
      links: [[1, 2, -1], [0, 1, Infinity], direct],
      expected: path5(2)
    },
    {
      id: "G17-undirected-negative-self-loop",
      kind: "undirected",
      links: [[0, 0, -1]],
      target: 0,
      expected: negative(0)
    },
    { id: "G18-no-cycle-infinity-only", kind: "directed", links: [[0, 3, Infinity]], expected: none }
  ]
  for (const test of cases) {
    it(test.id, ({ task }) => {
      assert.deepStrictEqual(query(task.meta, test.id, make(test.kind, test.links), test.target), test.expected)
    })
  }

  it("G19-mutable-data-last", ({ task }) => {
    const graph = Graph.beginMutation(make("directed", [...cycle, direct, [2, 3, Infinity]]))
    assert.deepStrictEqual(query(task.meta, "G19", graph, 3, true), path5(3))
  })

  it("G20-sparse-node-edge-identities", ({ task }) => {
    const graph = Graph.fromSnapshot({
      type: "directed",
      nodes: [0, 10, 20, 30].map((index) => ({ index, data: String(index) })),
      edges: [
        { index: 10, source: 0, target: 10, data: { id: 10, weight: 1 } },
        { index: 20, source: 10, target: 20, data: { id: 20, weight: -2 } },
        { index: 50, source: 20, target: 10, data: { id: 50, weight: 1 } },
        { index: 70, source: 0, target: 30, data: { id: 70, weight: 5 } },
        { index: 900, source: 20, target: 30, data: { id: 900, weight: Infinity } }
      ]
    })
    assert.deepStrictEqual(query(task.meta, "G20", graph, 30), {
      _tag: "Some",
      value: { path: [0, 30], edges: [70], distance: 5, costs: [{ id: 70, weight: 5 }] }
    })
  })

  it("G21-weight-callback-recomputed-on-next-query", ({ task }) => {
    const graph = make("directed", [...cycle, direct, [2, 3, Infinity]])
    const finite = query(task.meta, "G21-finite", graph, 3, false, (edge) => edge.id === 4 ? 1 : edge.weight)
    const blocked = query(task.meta, "G21-blocked", graph)
    assert.deepStrictEqual(finite, negative())
    assert.deepStrictEqual(blocked, path5(3))
  })

  it("G22-mutable-weight-cache-invalidation", ({ task }) => {
    const graph = Graph.beginMutation(make("directed", [...cycle, direct, [2, 3, 1]]))
    const before = query(task.meta, "G22-before", graph)
    Graph.updateEdge(graph, 4, (edge) => ({ ...edge, weight: Infinity }))
    const blocked = query(task.meta, "G22-blocked", graph)
    Graph.updateEdge(graph, 4, (edge) => ({ ...edge, weight: 1 }))
    const after = query(task.meta, "G22-after", graph)
    assert.deepStrictEqual([before, blocked, after], [negative(), path5(3), negative()])
  })

  it("G23-mutable-adjacency-cache-invalidation", ({ task }) => {
    const graph = Graph.beginMutation(make("directed", [...cycle, direct]))
    const before = query(task.meta, "G23-before", graph)
    const bridge = Graph.addEdge(graph, 2, 3, { id: 4, weight: Infinity })
    const blocked = query(task.meta, "G23-blocked", graph)
    const finite = Graph.addEdge(graph, 2, 3, { id: 5, weight: 1 })
    const connected = query(task.meta, "G23-connected", graph)
    Graph.removeEdge(graph, finite)
    const removed = query(task.meta, "G23-removed", graph)
    Graph.removeEdge(graph, bridge)
    const after = query(task.meta, "G23-after", graph)
    assert.deepStrictEqual([before, blocked, connected, removed, after], [
      path5(3),
      path5(3),
      negative(),
      path5(3),
      path5(3)
    ])
  })
})
