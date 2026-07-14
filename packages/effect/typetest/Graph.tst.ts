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
  it("compose", () => {
    expect(Graph.compose(directedNodes, directedNodes, (node) => {
      expect(node).type.toBe<Node>()
      return node.id
    })).type.toBe<Graph.DirectedGraph<Node, number>>()

    expect(pipe(
      undirectedNodes,
      Graph.compose(undirectedNodes, (node) => {
        expect(node).type.toBe<Node>()
        return node.id
      })
    )).type.toBe<Graph.UndirectedGraph<Node, number>>()
  })

  it("intersection", () => {
    expect(Graph.intersection(directedNodes, directedNodes, (node) => {
      expect(node).type.toBe<Node>()
      return node.id
    })).type.toBe<Graph.DirectedGraph<Node, number>>()

    expect(pipe(
      undirectedNodes,
      Graph.intersection(undirectedNodes, (node) => {
        expect(node).type.toBe<Node>()
        return node.id
      })
    )).type.toBe<Graph.UndirectedGraph<Node, number>>()
  })

  it("difference", () => {
    expect(Graph.difference(directedNodes, directedNodes, (node) => {
      expect(node).type.toBe<Node>()
      return node.id
    })).type.toBe<Graph.DirectedGraph<Node, number>>()

    expect(pipe(
      undirectedNodes,
      Graph.difference(undirectedNodes, (node) => {
        expect(node).type.toBe<Node>()
        return node.id
      })
    )).type.toBe<Graph.UndirectedGraph<Node, number>>()
  })

  it("symmetricDifference", () => {
    expect(Graph.symmetricDifference(directedNodes, directedNodes, (node) => {
      expect(node).type.toBe<Node>()
      return node.id
    })).type.toBe<Graph.DirectedGraph<Node, number>>()

    expect(pipe(
      undirectedNodes,
      Graph.symmetricDifference(undirectedNodes, (node) => {
        expect(node).type.toBe<Node>()
        return node.id
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
    expect(Graph.neighborhood(directed, 0, { radius: 2, direction: "both" })).type.toBe<
      Graph.DirectedGraph<string, number>
    >()
    expect(pipe(undirected, Graph.neighborhood(0, { radius: 2, direction: "outgoing" }))).type.toBe<
      Graph.UndirectedGraph<string, number>
    >()
  })

  it("sum", () => {
    expect(Graph.sum(directed, directed)).type.toBe<Graph.DirectedGraph<string, number>>()
    expect(pipe(undirected, Graph.sum(undirected))).type.toBe<Graph.UndirectedGraph<string, number>>()
  })
})
