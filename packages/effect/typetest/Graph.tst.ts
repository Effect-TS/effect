import { Graph, pipe } from "effect"
import { describe, expect, it } from "tstyche"

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

})
