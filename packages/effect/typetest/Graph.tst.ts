import { Graph, pipe } from "effect"
import { describe, expect, it } from "tstyche"

declare const directed: Graph.DirectedGraph<string, number>
declare const undirected: Graph.UndirectedGraph<string, number>

interface Node {
  readonly id: string
}

declare const directedNodes: Graph.DirectedGraph<Node, number>
declare const undirectedNodes: Graph.UndirectedGraph<Node, number>

describe("Graph", () => {
  it("make", () => {
    expect(
      Graph.make("directed")<string, number>((mutable) => {
        expect(mutable).type.toBe<Graph.MutableDirectedGraph<string, number>>()
      })
    ).type.toBe<Graph.DirectedGraph<string, number>>()

    expect(
      Graph.make("undirected")<string, number>((mutable) => {
        expect(mutable).type.toBe<Graph.MutableUndirectedGraph<string, number>>()
      })
    ).type.toBe<Graph.UndirectedGraph<string, number>>()
  })

  it("compose", () => {
    expect(Graph.compose(directedNodes, directedNodes, {
      nodeIdentity: (node) => {
        expect(node).type.toBe<Node>()
        return node.id
      },
      edgeIdentity: (edge) => {
        expect(edge).type.toBe<number>()
        return edge
      }
    })).type.toBe<Graph.DirectedGraph<Node, number>>()

    expect(pipe(
      undirectedNodes,
      Graph.compose(undirectedNodes, {
        nodeIdentity: (node) => {
          expect(node).type.toBe<Node>()
          return node.id
        }
      })
    )).type.toBe<Graph.UndirectedGraph<Node, number>>()
  })

  it("intersection", () => {
    expect(Graph.intersection(directedNodes, directedNodes)).type.toBe<Graph.DirectedGraph<Node, number>>()

    expect(pipe(
      undirectedNodes,
      Graph.intersection(undirectedNodes)
    )).type.toBe<Graph.UndirectedGraph<Node, number>>()
  })

  it("difference", () => {
    expect(Graph.difference(directedNodes, directedNodes, {
      nodeIdentity: (node) => {
        expect(node).type.toBe<Node>()
        return node.id
      }
    })).type.toBe<Graph.DirectedGraph<Node, number>>()

    expect(pipe(
      undirectedNodes,
      Graph.difference(undirectedNodes, {
        nodeIdentity: (node) => {
          expect(node).type.toBe<Node>()
          return node.id
        }
      })
    )).type.toBe<Graph.UndirectedGraph<Node, number>>()
  })

  it("symmetricDifference", () => {
    expect(Graph.symmetricDifference(directedNodes, directedNodes, {
      nodeIdentity: (node) => {
        expect(node).type.toBe<Node>()
        return node.id
      }
    })).type.toBe<Graph.DirectedGraph<Node, number>>()

    expect(pipe(
      undirectedNodes,
      Graph.symmetricDifference(undirectedNodes, {
        nodeIdentity: (node) => {
          expect(node).type.toBe<Node>()
          return node.id
        }
      })
    )).type.toBe<Graph.UndirectedGraph<Node, number>>()
  })

  it("complement", () => {
    expect(Graph.complement(directed, (source, target) => {
      expect(source).type.toBe<string>()
      expect(target).type.toBe<string>()
      return source.length + target.length
    })).type.toBe<Graph.DirectedGraph<string, number>>()

    expect(pipe(
      undirected,
      Graph.complement((source, target) => {
        expect(source).type.toBe<string>()
        expect(target).type.toBe<string>()
        return source.length + target.length
      })
    )).type.toBe<Graph.UndirectedGraph<string, number>>()
  })

  it("neighborhood", () => {
    expect(Graph.neighborhood(directed, 0)).type.toBe<Graph.DirectedGraph<string, number>>()
    expect(Graph.neighborhood(directed, 0, { radius: 2, direction: "undirected" })).type.toBe<
      Graph.DirectedGraph<string, number>
    >()
    expect(pipe(undirected, Graph.neighborhood(0, { radius: 2, direction: "outgoing" }))).type.toBe<
      Graph.UndirectedGraph<string, number>
    >()
  })

  it("undirected traversal", () => {
    expect(Graph.dfs(directed, { direction: "undirected", radius: 1 })).type.toBe<Graph.NodeWalker<string>>()
    expect(Graph.bfs(directed, { direction: "undirected", radius: 1 })).type.toBe<Graph.NodeWalker<string>>()
    expect(Graph.dfsPostOrder(directed, { direction: "undirected", radius: 1 })).type.toBe<Graph.NodeWalker<string>>()
  })

  it("sum", () => {
    expect(Graph.sum(directed, directed)).type.toBe<Graph.DirectedGraph<string, number>>()
    expect(pipe(undirected, Graph.sum(undirected))).type.toBe<Graph.UndirectedGraph<string, number>>()
  })
})
