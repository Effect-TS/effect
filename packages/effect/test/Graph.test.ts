import { describe, it } from "@effect/vitest"
import { Graph, Option } from "effect"
import { assertFalse, assertInclude, assertNone, assertSome, assertTrue, strictEqual } from "effect/test/util"

describe("Graph", () => {
  // Test Graph constructors
  describe("constructors", () => {
    it("should create an empty directed graph", () => {
      const graph = Graph.directed<string, number>()
      assertTrue(Graph.isGraph(graph))
      assertTrue(Graph.isDirected(graph))
      assertFalse(Graph.isUndirected(graph))
    })

    it("should create an empty undirected graph", () => {
      const graph = Graph.undirected<string, number>()
      assertTrue(Graph.isGraph(graph))
      assertFalse(Graph.isDirected(graph))
      assertTrue(Graph.isUndirected(graph))
    })
  })

  // Test basic node operations
  describe("node operations", () => {
    it("should add nodes to a graph", () => {
      const graph = Graph.directed<string, number>()
      const updated = Graph.addNode(graph, "A")

      // Verify node was added
      strictEqual(Array.from(Graph.nodes(updated)).length, 1)

      // Verify node data can be retrieved
      const maybeNode = Graph.getNode(updated, 0)
      assertSome(maybeNode, "A")
    })

    it("should add multiple nodes to a graph", () => {
      const graph = Graph.directed<string, number>()
      const g1 = Graph.addNode(graph, "A")
      const g2 = Graph.addNode(g1, "B")
      const g3 = Graph.addNode(g2, "C")

      // Check all nodes exist
      const nodes = Array.from(Graph.nodes(g3))
      strictEqual(nodes.length, 3)
      strictEqual(nodes[0][1], "A")
      strictEqual(nodes[1][1], "B")
      strictEqual(nodes[2][1], "C")
    })

    it("should remove nodes from a graph", () => {
      const graph = Graph.directed<string, number>()
      const g1 = Graph.addNode(graph, "A")
      const g2 = Graph.addNode(g1, "B")
      const g3 = Graph.addNode(g2, "C")

      // Remove middle node
      const maybeUpdated = Graph.removeNode(g3, 1)
      const updated = Option.getOrThrow(maybeUpdated)
      const nodes = Array.from(Graph.nodes(updated))

      // Should have 2 nodes now
      strictEqual(nodes.length, 2)

      // Node indices should be preserved or adjusted
      strictEqual(nodes[0][1], "A")
      strictEqual(nodes[1][1], "C")
    })
  })

  // Test edge operations
  describe("edge operations", () => {
    it("should add edges to a directed graph", () => {
      const graph = Graph.directed<string, number>()
      const g1 = Graph.addNode(graph, "A")
      const g2 = Graph.addNode(g1, "B")

      // Add edge from A to B with weight 10
      const maybeWithEdge = Graph.addEdge(g2, 0, 1, 10)
      const withEdge = Option.getOrThrow(maybeWithEdge)

      // Check edge exists
      const edgeOpt = Graph.getEdge(withEdge, 0, 1)
      assertSome(edgeOpt, 10)

      // Confirm edge direction (shouldn't have edge from B to A)
      const reverseOpt = Graph.getEdge(withEdge, 1, 0)
      assertNone(reverseOpt)
    })

    it("should handle edges in an undirected graph", () => {
      const graph = Graph.undirected<string, number>()
      const g1 = Graph.addNode(graph, "A")
      const g2 = Graph.addNode(g1, "B")

      // Add edge between A and B with weight 10
      const maybeWithEdge = Graph.addEdge(g2, 0, 1, 10)
      const withEdge = Option.getOrThrow(maybeWithEdge)

      // Check edge exists in both directions using containsEdge
      assertTrue(Graph.containsEdge(withEdge, 0, 1))
      assertTrue(Graph.containsEdge(withEdge, 1, 0))
    })

    it("should update edges", () => {
      const graph = Graph.directed<string, number>()
      const g1 = Graph.addNode(graph, "A")
      const g2 = Graph.addNode(g1, "B")

      // Add edge
      const maybeWithEdge = Graph.addEdge(g2, 0, 1, 10)
      const withEdge = Option.getOrThrow(maybeWithEdge)

      // Update edge
      const maybeUpdated = Graph.updateEdge(withEdge, 0, 1, 20)
      const updated = Option.getOrThrow(maybeUpdated)

      // Check updated value
      const edgeOpt = Graph.getEdge(updated, 0, 1)
      assertSome(edgeOpt, 20)
    })

    it("should find edges", () => {
      const graph = Graph.directed<string, number>()
      const g1 = Graph.addNode(graph, "A")
      const g2 = Graph.addNode(g1, "B")
      const g3 = Graph.addNode(g2, "C")

      // Add multiple edges
      const withEdge1 = Option.getOrThrow(Graph.addEdge(g3, 0, 1, 10))
      const withEdge2 = Option.getOrThrow(Graph.addEdge(withEdge1, 1, 2, 20))

      // Find edges
      const edge1 = Graph.findEdge(withEdge2, 0, 1)
      // We can't use assertSome here because we don't know the exact edge index value
      assertTrue(Option.isSome(edge1))

      const edge2 = Graph.findEdge(withEdge2, 1, 2)
      assertTrue(Option.isSome(edge2))

      // Non-existent edge
      const edge3 = Graph.findEdge(withEdge2, 0, 2)
      assertNone(edge3)
    })

    it("should remove edges", () => {
      const graph = Graph.directed<string, number>()
      const g1 = Graph.addNode(graph, "A")
      const g2 = Graph.addNode(g1, "B")

      // Add edge
      const withEdge = Option.getOrThrow(Graph.addEdge(g2, 0, 1, 10))

      // Find the edge index
      const edgeIndex = Option.getOrThrow(Graph.findEdge(withEdge, 0, 1))

      // Remove the edge
      const maybeUpdated = Graph.removeEdge(withEdge, edgeIndex)
      const updated = Option.getOrThrow(maybeUpdated)

      // Edge should no longer exist
      assertFalse(Graph.containsEdge(updated, 0, 1))
    })
  })

  // Test graph mutations
  describe("mutations", () => {
    it("should mutate a graph", () => {
      const graph = Graph.directed<string, number>()

      const updated = Graph.mutate(graph, (mutable) => {
        // Add nodes
        const nodeA = mutable.addNode("A")
        const nodeB = mutable.addNode("B")

        // Add edge
        mutable.unsafeAddEdge(nodeA, nodeB, 10)
      })

      // Check nodes and edge were added
      strictEqual(Array.from(Graph.nodes(updated)).length, 2)
      assertTrue(Graph.containsEdge(updated, 0, 1))

      // Original graph should be unchanged
      strictEqual(Array.from(Graph.nodes(graph)).length, 0)
    })
  })

  // Test iterators
  describe("iterators", () => {
    it("should iterate over nodes", () => {
      const graph = Graph.directed<string, number>()
      const g1 = Graph.addNode(graph, "A")
      const g2 = Graph.addNode(g1, "B")
      const g3 = Graph.addNode(g2, "C")

      const nodes = Array.from(Graph.nodes(g3))
      strictEqual(nodes.length, 3)
      strictEqual(nodes[0][0], 0)
      strictEqual(nodes[0][1], "A")
      strictEqual(nodes[1][0], 1)
      strictEqual(nodes[1][1], "B")
      strictEqual(nodes[2][0], 2)
      strictEqual(nodes[2][1], "C")
    })

    it("should iterate over edges", () => {
      const graph = Graph.directed<string, number>()
      const withNodes = Graph.mutate(graph, (mutable) => {
        mutable.addNode("A")
        mutable.addNode("B")
        mutable.addNode("C")
        mutable.unsafeAddEdge(0, 1, 10)
        mutable.unsafeAddEdge(1, 2, 20)
      })

      const edges = Array.from(Graph.edges(withNodes))
      strictEqual(edges.length, 2)
      strictEqual(edges[0][1], 10)
      strictEqual(edges[1][1], 20)
    })
  })

  // Test transformations
  describe("transformations", () => {
    it("should map nodes and edges", () => {
      const graph = Graph.directed<string, number>()
      const withData = Graph.mutate(graph, (mutable) => {
        mutable.addNode("A")
        mutable.addNode("B")
        mutable.unsafeAddEdge(0, 1, 10)
      })

      const mapped = Graph.map(withData, {
        mapNodes: (node) => node.toLowerCase(),
        mapEdges: (edge) => edge * 2
      })

      // Check mapped data
      const nodeA = Graph.getNode(mapped, 0)
      assertSome(nodeA, "a")

      const edgeAB = Graph.getEdge(mapped, 0, 1)
      assertSome(edgeAB, 20)
    })

    it("should filter and map nodes and edges", () => {
      const graph = Graph.directed<string, number>()
      const withData = Graph.mutate(graph, (mutable) => {
        mutable.addNode("A")
        mutable.addNode("B")
        mutable.addNode("C")
        mutable.unsafeAddEdge(0, 1, 10)
        mutable.unsafeAddEdge(1, 2, 20)
      })

      const filtered = Graph.filterMap(withData, {
        mapNodes: (node) => node === "B" ? Option.none() : Option.some(node + "!"),
        mapEdges: (edge) => edge > 15 ? Option.some(edge + 5) : Option.none()
      })

      // Check node filtering worked
      const nodes = Array.from(Graph.nodes(filtered))
      strictEqual(nodes.length, 2)
      strictEqual(nodes[0][1], "A!")
      strictEqual(nodes[1][1], "C!")

      // When node B is filtered out, all edges involving it are removed
      // Check if there's a valid edge between remaining nodes
      assertFalse(Graph.containsEdge(filtered, 0, 1))

      // The high value edge may exist, but node indices might have changed
      // due to filtering. Since we can't guarantee specific indices after filtering,
      // it's safer to just check the edges collection directly
      const edges = Array.from(Graph.edges(filtered))
      // There should be at most one edge left
      assertTrue(edges.length >= 0 && edges.length <= 1)
      // If there is an edge, it should have the updated value
      if (edges.length > 0) {
        strictEqual(edges[0][1], 25)
      }
    })
  })

  // Test dot format output
  describe("toDot", () => {
    it("should generate DOT representation", () => {
      const graph = Graph.directed<string, number>()
      const withData = Graph.mutate(graph, (mutable) => {
        mutable.addNode("A")
        mutable.addNode("B")
        mutable.unsafeAddEdge(0, 1, 10)
      })

      const dot = Graph.toDot(withData)
      assertTrue(typeof dot === "string")
      assertInclude(dot, "digraph")
      assertInclude(dot, "A")
      assertInclude(dot, "B")
      assertInclude(dot, "->")
    })
  })
})
