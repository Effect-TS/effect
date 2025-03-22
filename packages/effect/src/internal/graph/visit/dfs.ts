import type * as Graph from "../../../Graph.js"
import * as Option from "../../../Option.js"
import * as graph from "../graph.js"

/**
 * A depth first search (DFS) visitor event.
 *
 * @since 3.12.0
 * @category models
 */
export type DfsEvent<N> =
  | { readonly _tag: "Discover"; readonly node: N }
  | { readonly _tag: "TreeEdge"; readonly from: N; readonly to: N }
  | { readonly _tag: "BackEdge"; readonly from: N; readonly to: N }
  | { readonly _tag: "CrossForwardEdge"; readonly from: N; readonly to: N }
  | { readonly _tag: "Finish"; readonly node: N }

/**
 * Control flow for `depthFirstSearch` callbacks.
 *
 * @since 3.12.0
 * @category models
 */
export type Control<B> =
  | { readonly _tag: "Continue" }
  | { readonly _tag: "Prune" }
  | { readonly _tag: "Break"; readonly value: B }

/**
 * A recursive depth first search.
 *
 * Starting points are the nodes in the iterator `starts` (specify just one
 * start vertex *x* by using `Some(x)`).
 *
 * The traversal emits discovery and finish events for each reachable vertex,
 * and edge classification of each reachable edge. `visitor` is called for each
 * event.
 *
 * @since 3.12.0
 * @category combinators
 */
export const depthFirstSearch = <N, E, B>(
  self: Graph.Graph<N, E>,
  starts: Iterable<number>,
  visitor: (event: DfsEvent<N>) => Control<B>
): Option.Option<B> => {
  const discovered = new Set<number>()
  const finished = new Set<number>()

  for (const start of starts) {
    const result = dfsVisitor(self, start, visitor, discovered, finished)
    if (result._tag === "Break") {
      return Option.some(result.value)
    }
  }

  return Option.none()
}

/** @internal */
const dfsVisitor = <N, E, B>(
  self: Graph.Graph<N, E>,
  u: number,
  visitor: (event: DfsEvent<N>) => Control<B>,
  discovered: Set<number>,
  finished: Set<number>
): Control<B> => {
  if (discovered.has(u)) {
    return { _tag: "Continue" }
  }

  discovered.add(u)
  const node = self.nodes[u]
  if (!node) {
    return { _tag: "Continue" }
  }

  const result = visitor({
    _tag: "Discover",
    node: node.data
  })

  if (result._tag === "Break") {
    return result
  }

  if (result._tag !== "Prune") {
    for (const [, edge] of new graph.EdgeWalker(self, graph.OUTGOING, node.next[graph.OUTGOING])) {
      const v = edge.node[graph.INCOMING]

      if (!discovered.has(v)) {
        const result = visitor({
          _tag: "TreeEdge",
          from: node.data,
          to: self.nodes[v].data
        })

        if (result._tag === "Break") {
          return result
        }

        if (result._tag !== "Prune") {
          const result = dfsVisitor(self, v, visitor, discovered, finished)
          if (result._tag === "Break") {
            return result
          }
        }
      } else if (!finished.has(v)) {
        const result = visitor({
          _tag: "BackEdge",
          from: node.data,
          to: self.nodes[v].data
        })
        if (result._tag === "Break") {
          return result
        }
      } else {
        const result = visitor({
          _tag: "CrossForwardEdge",
          from: node.data,
          to: self.nodes[v].data
        })
        if (result._tag === "Break") {
          return result
        }
      }
    }
  }

  finished.add(u)

  const result2 = visitor({
    _tag: "Finish",
    node: node.data
  })

  if (result2._tag === "Prune") {
    throw new Error("Pruning from Finish event")
  }

  return result2
}
