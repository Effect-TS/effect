/**
 * @since 3.12.0
 */
import { dual } from "./Function.js"
import * as Inspectable from "./Inspectable.js"
import * as Option from "./Option.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import { hasProperty } from "./Predicate.js"
import type * as Types from "./Types.js"

/**
 * @since 3.12.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("effect/Graph")

/**
 * @since 3.12.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 3.12.0
 * @category models
 */
export type Graph<N, E> = Graph.Directed<N, E> | Graph.Undirected<N, E>

/**
 * @since 3.12.0
 * @category models
 */
export declare namespace Graph {
  /**
   * @since 3.12.0
   */
  export type Any = Graph<any, any>

  /**
   * @since 3.12.0
   */
  export type Unknown = Graph<unknown, unknown>

  /**
   * @since 3.12.0
   */
  export type Preserve<
    A extends Any,
    N = Node.Data<A>,
    E = Edge.Data<A>
  > = A extends Directed<any, any> ? Directed<N, E> :
    A extends Undirected<any, any> ? Undirected<N, E> :
    never

  /**
   * @since 3.12.0
   * @category models
   */
  export interface Variance<in out N, in out E> {
    readonly [TypeId]: {
      readonly _A: Types.Invariant<N>
      readonly _E: Types.Invariant<E>
    }
  }

  /**
   * @since 3.12.0
   * @category models
   */
  export interface Proto<
    in out N,
    in out E
  > extends Pipeable, Inspectable.Inspectable, Variance<N, E> {
    /** @internal */
    nodes: Array<Node<N>>
    /** @internal */
    edges: Array<Edge<E>>
  }

  /**
   * @since 3.12.0
   * @category models
   */
  export interface Directed<N, E> extends Proto<N, E> {
    readonly _tag: "DirectedGraph"
  }

  /**
   * @since 3.12.0
   * @category models
   */
  export interface Undirected<N, E> extends Proto<N, E> {
    readonly _tag: "UndirectedGraph"
  }
}

/**
 * @since 3.12.0
 * @category type ids
 */
export const NodeTypeId: unique symbol = Symbol.for("effect/GraphNode")

/**
 * @since 3.12.0
 * @category type ids
 */
export type NodeTypeId = typeof NodeTypeId

/**
 * @since 3.12.0
 * @category models
 */
export interface Node<in out N> extends Pipeable, Inspectable.Inspectable, Node.Variance<N> {
  readonly _tag: "GraphNode"

  /**
   * Associated node data.
   */
  readonly data: N

  /**
   * Next edge in outgoing and incoming edge lists.
   *
   * @internal
   */
  readonly next: [number, number]
}

/**
 * @since 3.12.0
 * @category models
 */
export declare namespace Node {
  /**
   * @since 3.12.0
   */
  export type Any = Node<any>

  /**
   * @since 3.12.0
   */
  export type Unknown = Node<unknown>

  /**
   * @since 3.12.0
   */
  export type Data<A extends Graph.Any | Any> = A extends Node<infer N> ? N : A extends Graph<infer N, any> ? N : never

  /**
   * @since 3.12.0
   * @category models
   */
  export interface Variance<in out N> {
    readonly [NodeTypeId]: {
      readonly _N: Types.Invariant<N>
    }
  }
}

/**
 * @since 3.12.0
 * @category type ids
 */
export const EdgeTypeId: unique symbol = Symbol.for("effect/GraphEdge")

/**
 * @since 3.12.0
 * @category type ids
 */
export type EdgeTypeId = typeof EdgeTypeId

/**
 * @since 3.12.0
 * @category models
 */
export interface Edge<in out E> extends Pipeable, Inspectable.Inspectable, Edge.Variance<E> {
  readonly _tag: "GraphEdge"

  /**
   * Associated node data.
   */
  readonly data: E

  /**
   * Next edge in outgoing and incoming edge lists.
   *
   * @internal
   */
  readonly next: [number, number]

  /**
   * Start and end node index.
   *
   * @internal
   */
  readonly node: [number, number]
}

const OUTGOING: Edge.Outgoing = 0
const INCOMING: Edge.Incoming = 1
const DIRECTIONS: [Edge.Outgoing, Edge.Incoming] = [OUTGOING, INCOMING]

/**
 * @since 3.12.0
 * @category models
 */
export declare namespace Edge {
  /**
   * @since 3.12.0
   */
  export type Any = Edge<any>

  /**
   * @since 3.12.0
   */
  export type Unknown = Edge<unknown>

  /**
   * @since 3.12.0
   */
  export type Data<A extends Graph.Any | Any> = A extends Edge<infer E> ? E : A extends Graph<any, infer E> ? E : never

  /**
   * @since 3.12.0
   */
  export type Outgoing = 0

  /**
   * @since 3.12.0
   */
  export type Incoming = 1

  /**
   * @since 3.12.0
   */
  export type Direction = Outgoing | Incoming

  /**
   * @since 3.12.0
   * @category models
   */
  export interface Variance<in out E> {
    readonly [TypeId]: {
      readonly _E: Types.Invariant<E>
    }
  }
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Inspectable.NodeInspectSymbol](this: Graph.Unknown) {
    const type = isDirected(this) ? "Directed" : isUndirected(this) ? "Undirected" : ""
    return `${type}Graph(${this.nodes.length} nodes, ${this.edges.length} edges)`
  },
  toJSON(this: Graph.Unknown) {
    return {
      nodes: this.nodes.map((node) => node.toJSON()),
      edges: this.edges.map((edge) => edge.toJSON())
    }
  }
}

const ProtoNode = {
  [NodeTypeId]: NodeTypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Inspectable.NodeInspectSymbol](this: Node<unknown>) {
    if (typeof this.data === "string") {
      return `Node(${this.data})`
    }

    return "Node(<data>)"
  },
  toJSON(this: Node<unknown>) {
    return {
      next: this.next,
      data: this.data
    }
  }
}

const ProtoEdge = {
  [EdgeTypeId]: EdgeTypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Inspectable.NodeInspectSymbol](this: Edge<unknown>) {
    if (typeof this.data === "string") {
      return `Edge(${this.node[0]} -> ${this.node[1]}: ${this.data})`
    }

    return `Edge(${this.node[0]} -> ${this.node[1]}: <data>)`
  },
  toJSON(this: Edge<unknown>) {
    return {
      next: this.next,
      node: this.node,
      data: this.data
    }
  }
}

/**
 * @since 3.12.0
 * @category type ids
 */
export const MutableTypeId: unique symbol = Symbol.for("effect/GraphMutable")

/**
 * @since 3.12.0
 * @category type ids
 */
export type MutableTypeId = typeof MutableTypeId

/**
 * @since 3.12.0
 * @category models
 */
export interface Mutable<in out A extends Graph.Any> {
  readonly [MutableTypeId]: {
    readonly _A: Types.Invariant<A>
  }

  readonly graph: A

  /**
   * @since 3.12.0
   * @category combinators
   */
  addNode(data: Node.Data<A>): number

  /**
   * @since 3.12.0
   * @category combinators
   */
  addEdge(from: number, to: number, data: Edge.Data<A>): Option.Option<number>

  /**
   * @since 3.12.0
   * @category combinators
   */
  updateEdge(from: number, to: number, data: Edge.Data<A>): Option.Option<number>

  /**
   * @since 3.12.0
   * @category combinators
   */
  unsafeAddEdge(from: number, to: number, data: Edge.Data<A>): number

  /**
   * @since 3.12.0
   * @category combinators
   */
  unsafeUpdateEdge(from: number, to: number, data: Edge.Data<A>): number

  /**
   * @since 3.12.0
   * @category combinators
   */
  removeEdge(edge: number): Option.Option<Edge.Data<A>>

  /**
   * @since 3.12.0
   * @category combinators
   */
  removeNode(node: number): Option.Option<Node.Data<A>>
}

class MutableImpl<in out A extends Graph.Any> implements Mutable<A> {
  readonly [MutableTypeId] = {
    _A: (_: any) => _
  }

  constructor(readonly graph: A) {}

  addNode(data: Node.Data<A>): number {
    const node = makeNode(data, [-1, -1])
    return this.graph.nodes.push(node) - 1
  }

  addEdge(from: number, to: number, data: Edge.Data<A>): Option.Option<number> {
    const index = this.graph.edges.length

    if (from === to) {
      const an = this.graph.nodes[from]
      if (an === undefined) {
        return Option.none()
      }

      this.graph.edges.push(makeEdge(data, [from, to], an.next))
      this.graph.nodes[from] = makeNode(an.data, [index, index])
    } else {
      const an = this.graph.nodes[from]
      const bn = this.graph.nodes[to]
      if (an === undefined || bn === undefined) {
        return Option.none()
      }

      this.graph.edges.push(makeEdge(data, [from, to], an.next))
      this.graph.nodes[from] = makeNode(an.data, [index, an.next[INCOMING]])
      this.graph.nodes[to] = makeNode(bn.data, [bn.next[OUTGOING], index])
    }

    return Option.some(index)
  }

  unsafeAddEdge(from: number, to: number, data: Edge.Data<A>): number {
    return Option.getOrThrow(this.addEdge(from, to, data))
  }

  updateEdge(from: number, to: number, data: Edge.Data<A>): Option.Option<number> {
    return Option.match(findEdge(this.graph, from, to), {
      onSome: (ix) => {
        const edge = this.graph.edges[ix]
        const updated = makeEdge(data, edge.node, edge.next)
        this.graph.edges[ix] = updated

        return Option.some(ix)
      },
      onNone: () => this.addEdge(from, to, data)
    })
  }

  unsafeUpdateEdge(from: number, to: number, data: Edge.Data<A>): number {
    return Option.getOrThrow(this.updateEdge(from, to, data))
  }

  removeEdge(index: number): Option.Option<Edge.Data<A>> {
    const remove = this.graph.edges[index]
    if (remove === undefined) {
      return Option.none()
    }

    // Remove the edge from its in and out lists by replacing it with
    // a link to the next in the list.
    changeEdgeLinks(this.graph, remove.node, index, remove.next)
    removeEdgeAdjustIndices(this.graph, index)
    return Option.some(remove.data)
  }

  removeNode(index: number): Option.Option<Node.Data<A>> {
    const n = this.graph.nodes[index]
    if (n === undefined) {
      return Option.none()
    }

    for (const direction of DIRECTIONS) {
      while (true) {
        const next = n.next[direction]
        if (next === -1) {
          break
        }

        const removed = this.removeEdge(next)
        if (Option.isNone(removed)) {
          throw new Error("Edge not found")
        }
      }
    }

    const node = swapRemove(this.graph.nodes, index)

    // Find the edge lists of the node that had to relocate.
    const edges = this.graph.nodes[index]
    // It may be that no node had to relocate, then we are done already.
    if (edges !== undefined) {
      for (const direction of DIRECTIONS) {
        const k = direction
        const walker = new EdgeWalker(this.graph, direction, edges.next[k])
        for (const [_, edge] of walker) {
          edge.node[k] = index
        }
      }
    }

    return Option.some(node.data)
  }
}

/**
 * @since 3.12.0
 * @category combinators
 */
export const mutate = <A extends Graph.Any>(
  self: A,
  fn: (mutable: Mutable<A>) => void
): Graph.Preserve<A> => {
  const mutable = new MutableImpl(copy(self))
  fn(mutable as any)
  return mutable.graph
}

/**
 * @since 3.12.0
 * @category guards
 */
export const isGraph: (value: unknown) => value is Graph.Unknown = hasProperty(TypeId) as any

/**
 * @since 3.12.0
 * @category guards
 */
export const isDirected = <N, E>(value: unknown | Graph<N, E>): value is Graph.Directed<N, E> =>
  isGraph(value) && value._tag === "DirectedGraph"

/**
 * @since 3.12.0
 * @category guards
 */
export const isUndirected = <N, E>(value: unknown | Graph<N, E>): value is Graph.Undirected<N, E> =>
  isGraph(value) && value._tag === "UndirectedGraph"

const copy = <A extends Graph.Any>(graph: A): Graph.Preserve<A> => {
  const self = Object.create(Proto)
  self._tag = graph._tag
  self.nodes = graph.nodes.slice()
  self.edges = graph.edges.slice()
  return self
}

const makeDirected = <N, E>(
  nodes: ReadonlyArray<Node<N>>,
  edges: ReadonlyArray<Edge<E>>
): Graph.Directed<N, E> => {
  const self = Object.create(Proto)
  self._tag = "DirectedGraph"
  self.nodes = nodes
  self.edges = edges
  return self
}

/**
 * @since 3.12.0
 * @category constructors
 */
export const directed = <N, E>(): Graph.Directed<N, E> => makeDirected([], [])

const makeUndirected = <N, E>(
  nodes: ReadonlyArray<Node<N>>,
  edges: ReadonlyArray<Edge<E>>
): Graph.Undirected<N, E> => {
  const self = Object.create(Proto)
  self._tag = "UndirectedGraph"
  self.nodes = nodes
  self.edges = edges
  return self
}

/**
 * @since 3.12.0
 * @category constructors
 */
export const undirected = <N, E>(): Graph.Undirected<N, E> => makeUndirected([], [])

const makeNode = <N>(
  data: N,
  next: [number, number]
): Node<N> => {
  const self = Object.create(ProtoNode)
  self.data = data
  self.next = next
  return self
}

const makeEdge = <E>(
  data: E,
  node: [number, number],
  next: [number, number]
): Edge<E> => {
  const self = Object.create(ProtoEdge)
  self.data = data
  self.next = next
  self.node = node
  return self
}

/**
 * @since 3.12.0
 * @category combinators
 */
export const addNode: {
  <N>(data: N): <A extends Graph<N, any>>(self: A) => Graph.Preserve<A>
  <N, A extends Graph<N, any>>(self: A, data: N): Graph.Preserve<A>
} = dual(2, <N, E, A extends Graph<N, E>>(
  self: A,
  data: N
): Graph.Preserve<A> => mutate(self, (mutable) => mutable.addNode(data as any)))

/**
 * @since 3.12.0
 * @category combinators
 */
export const nodeData = <N>(
  graph: Graph<N, any>,
  index: number
): Option.Option<N> => Option.fromNullable(graph.nodes[index]).pipe(Option.map((node) => node.data))

/**
 * @since 3.12.0
 * @category combinators
 */
export const unsafeNodeData = <N>(
  graph: Graph<N, any>,
  index: number
): N => Option.getOrThrow(nodeData(graph, index))

/**
 * Add an edge from `a` to `b` to the graph, with its associated data `weight`.
 *
 * Return the index of the new edge.
 *
 * Computes in `O(1)` time.
 *
 * This allows adding parallel ("duplicate") edges. If you want to avoid this, use
 * {@link updateEdge} instead.
 *
 * @since 3.12.0
 * @category combinators
 */
export const addEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph<any, E>>(graph: A) => Option.Option<Graph.Preserve<A>>
  <E, A extends Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Option.Option<Graph.Preserve<A>>
} = dual(4, <E, A extends Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Option.Option<Graph.Preserve<A>> => {
  let index: Option.Option<number>
  const out = mutate(graph, (mutable) => {
    index = mutable.addEdge(from, to, data as any)
  })

  return index!.pipe(Option.as(out))
})

/**
 * @since 3.12.0
 * @category combinators
 */
export const unsafeAddEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph<any, E>>(graph: A) => Graph.Preserve<A>
  <E, A extends Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Graph.Preserve<A>
} = dual(4, <E, A extends Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Graph.Preserve<A> => Option.getOrThrow(addEdge(graph, from, to, data)))

/**
 * @since 3.12.0
 * @category combinators
 */
export const updateEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph<any, E>>(graph: A) => Option.Option<Graph.Preserve<A>>
  <E, A extends Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Option.Option<Graph.Preserve<A>>
} = dual(4, <E, A extends Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Option.Option<Graph.Preserve<A>> => {
  let index: Option.Option<number>
  const out = mutate(graph, (mutable) => {
    index = mutable.updateEdge(from, to, data as any)
  })

  return index!.pipe(Option.as(out))
})

/**
 * @since 3.12.0
 * @category combinators
 */
export const unsafeUpdateEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph<any, E>>(graph: A) => Graph.Preserve<A>
  <E, A extends Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Graph.Preserve<A>
} = dual(4, <E, A extends Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Graph.Preserve<A> => Option.getOrThrow(updateEdge(graph, from, to, data)))

/**
 * Lookup if there is an edge from `a` to `b`.
 *
 * Computes in `O(e)` time, where `e` is the number of edges connected
 * to `a` (and `b`, if the graph edges are undirected).
 *
 * @since 3.12.0
 * @category combinators
 */
export const containsEdge = <N, E>(
  graph: Graph<N, E>,
  a: number,
  b: number
): boolean => Option.isSome(findEdge(graph, a, b))

/**
 * Lookup an edge from `a` to `b`.
 *
 * Computes in `O(e)` time, where `e` is the number of edges connected to
 * `a` (and `b`, if the graph edges are undirected).
 *
 * @since 3.12.0
 * @category combinators
 */
export const findEdge = (
  graph: Graph.Any,
  a: number,
  b: number
): Option.Option<number> => {
  if (isUndirected(graph)) {
    return findEdgeUndirected(graph, a, b).pipe(Option.map(([index]) => index))
  }

  const node = graph.nodes[a]
  return node === undefined ? Option.none() : findEdgeDirectedFromNode(graph, node, b)
}

/**
 * Create a new `Graph` by mapping node and edge weights to new values.
 *
 * The resulting graph has the same structure and the same graph indices
 * as `self`.
 *
 * @since 3.12.0
 * @category combinators
 */
export const map = <A extends Graph.Any, N, E>(self: A, {
  mapEdges,
  mapNodes
}: {
  mapNodes: (data: Node.Data<A>) => N
  mapEdges: (data: Edge.Data<A>) => E
}): Graph.Preserve<A, N, E> =>
  mutate(self, (mutable) => {
    mutable.graph.nodes = self.nodes.map((node) => makeNode(mapNodes(node.data), node.next))
    mutable.graph.edges = self.edges.map((edge) => makeEdge(mapEdges(edge.data), edge.node, edge.next))
  }) as any

/**
 * Create a new `Graph` by mapping nodes and edges.
 *
 * A node or edge may be mapped to `None` to exclude it from the resulting graph.
 *
 * Nodes are mapped first with the `mapNodes` closure, then `mapEdges` is called
 * for the edges that have not had any endpoint removed.
 *
 * The resulting graph has the structure of a subgraph of the original graph.
 *
 * If no nodes are removed, the resulting graph has compatible node indices; if
 * neither nodes nor edges are removed, the result has the same graph indices as
 * `self`.
 *
 * @since 3.12.0
 * @category combinators
 */
export const filterMap = <A extends Graph.Any, N, E>(self: A, {
  mapEdges,
  mapNodes
}: {
  mapNodes: (data: Node.Data<A>) => Option.Option<N>
  mapEdges: (data: Edge.Data<A>) => Option.Option<E>
}): Graph.Preserve<A, N, E> =>
  mutate(self, (mutable) => {
    mutable.graph.nodes = []
    mutable.graph.edges = []

    const nodes: Array<number> = Array(self.nodes.length).fill(-1)
    for (const [i, node] of self.nodes.entries()) {
      const mapped = mapNodes(node.data)
      if (Option.isSome(mapped)) {
        nodes[i] = mutable.addNode(mapped.value as any)
      }
    }

    for (const edge of self.edges.values()) {
      const [from, to] = edge.node
      if (nodes[from] !== -1 && nodes[to] !== -1) {
        const mapped = mapEdges(edge.data)
        if (Option.isSome(mapped)) {
          mutable.addEdge(nodes[from], nodes[to], mapped.value as any)
        }
      }
    }
  }) as any

const findEdgeDirectedFromNode = <N, E>(
  graph: Graph.Directed<N, E>,
  node: Node<N>,
  index: number
): Option.Option<number> => {
  let edix = node.next[OUTGOING]
  let edge: Edge<E>
  while ((edge = graph.edges[edix]) !== undefined) {
    if (edge.node[INCOMING] == index) {
      return Option.some(edix)
    }
    edix = edge.next[OUTGOING]
  }

  return Option.none()
}

const findEdgeUndirectedFromNode = <N, E>(
  graph: Graph.Undirected<N, E>,
  node: Node<N>,
  index: number
): Option.Option<[number, Edge.Direction]> => {
  for (const direction of DIRECTIONS) {
    let edix = node.next[direction]
    let edge: Edge<E>
    while ((edge = graph.edges[edix]) !== undefined) {
      if (edge.node[1 - direction] === index) {
        return Option.some([edix, direction])
      }
      edix = edge.next[direction]
    }
  }

  return Option.none()
}

const findEdgeUndirected = <N, E>(
  graph: Graph.Undirected<N, E>,
  a: number,
  b: number
): Option.Option<[number, Edge.Direction]> => {
  const an = graph.nodes[a]
  if (an === undefined) {
    return Option.none()
  }

  return findEdgeUndirectedFromNode(graph, an, b)
}

/**
 * @since 3.12.0
 * @category combinators
 */
export const nodes = <A extends Graph.Any>(
  graph: A
): IterableIterator<[number, Node.Data<A>]> => new NodeIterator(graph, (index, data) => [index, data] as const)

/**
 * @since 3.12.0
 * @category combinators
 */
export const edges = <A extends Graph.Any>(
  graph: A
): IterableIterator<[number, Edge.Data<A>]> => new EdgeIterator(graph, (index, data) => [index, data] as const)

/**
 * @since 3.12.0
 * @category combinators
 */
export const externals = <A extends Graph.Any>(
  graph: A,
  direction: Edge.Direction
): IterableIterator<[number, Node.Data<A>]> =>
  new ExternalsIterator(graph, direction, (index, data) => [index, data] as const)

/**
 * Swap the element at `index` with the last element in the array.
 *
 * This ensures that the array remains contiguous.
 */
const swapRemove = <A>(
  array: Array<A>,
  index: number
): A => {
  const out = array[index]
  const last = array.pop()!
  if (out !== last) {
    array[index] = last
  }

  return out
}

/**
 * For edge `edge` with endpoints `node`, replace links to it, with links to `next`.
 */
const changeEdgeLinks = <A extends Graph.Any>(
  graph: A,
  node: [number, number],
  edge: number,
  next: [number, number]
): void => {
  for (const direction of DIRECTIONS) {
    const k = direction
    const n = node[k]
    const an = graph.nodes[n]
    if (an === undefined) {
      throw new Error(`Edge's endpoint not found (dir: ${direction}, index: ${n})`)
    }

    const fst = an.next[k]
    if (fst === edge) {
      an.next[k] = next[k]
    } else {
      const walker = new EdgeWalker(graph, direction, n)
      for (const [, e] of walker) {
        if (e.next[k] === edge) {
          e.next[k] = next[k]
          break
        }
      }
    }
  }
}

/**
 * Remove edge `edge` from the graph and adjust the indices.
 */
const removeEdgeAdjustIndices = <A extends Graph.Any>(graph: A, edge: number): Edge<Edge.Data<A>> => {
  const removed = swapRemove(graph.edges, edge)
  const swap = graph.edges[edge]
  if (swap !== undefined) {
    const swapped = graph.edges.length
    changeEdgeLinks(graph, swap.node, swapped, [edge, edge])
  }
  return removed
}

class NodeIterator<in out A extends Graph.Any, out T> implements IterableIterator<T> {
  private index = 0

  constructor(
    private readonly graph: A,
    private readonly map: (index: number, data: Node.Data<A>) => T,
    private readonly filter?: (index: number, data: Node.Data<A>) => boolean
  ) {}

  next(): IteratorResult<T> {
    const node = this.graph.nodes[this.index++]
    if (node !== undefined && (this.filter === undefined || this.filter(this.index - 1, node.data))) {
      const value = this.map(this.index - 1, node.data)
      return { done: false, value }
    }

    return { done: true, value: undefined }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new NodeIterator(this.graph, this.map, this.filter)
  }
}

class EdgeIterator<in out A extends Graph.Any, out T> implements IterableIterator<T> {
  private index = 0

  constructor(
    private readonly graph: A,
    private readonly map: (index: number, data: Edge.Data<A>) => T,
    private readonly filter?: (index: number, data: Edge.Data<A>) => boolean
  ) {}

  next(): IteratorResult<T> {
    const node = this.graph.edges[this.index++]
    if (node !== undefined && (this.filter === undefined || this.filter(this.index - 1, node.data))) {
      const value = this.map(this.index - 1, node.data)
      return { done: false, value }
    }

    return { done: true, value: undefined }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new EdgeIterator(this.graph, this.map, this.filter)
  }
}

class ExternalsIterator<in out A extends Graph.Any, out T> implements IterableIterator<T> {
  private index = 0

  constructor(
    private readonly graph: A,
    private readonly direction: Edge.Direction,
    private readonly map: (index: number, data: Node.Data<A>) => T,
    private readonly filter?: (index: number, data: Node.Data<A>) => boolean
  ) {}

  next(): IteratorResult<T> {
    let node: Node<Node.Data<A>>
    while ((node = this.graph.nodes[this.index++]) !== undefined) {
      const edge = node.next[this.direction]
      if (edge === -1 && (isDirected(this.graph) || node.next[1 - this.direction] === -1)) {
        if (this.filter === undefined || this.filter(this.index - 1, node.data)) {
          const value = this.map(this.index - 1, node.data)
          return { done: false, value }
        }
      }
    }

    return { done: true, value: undefined }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new ExternalsIterator(this.graph, this.direction, this.map, this.filter)
  }
}

class EdgeWalker<in out A extends Graph.Any> implements Iterator<[number, Edge<Edge.Data<A>>]> {
  counter = 0
  constructor(
    private readonly graph: A,
    private readonly direction: Edge.Direction,
    private nxt: number
  ) {}

  next(): IteratorResult<[number, Edge<Edge.Data<A>>]> {
    const current = this.nxt
    const edge = this.graph.edges[current]
    if (edge !== undefined) {
      this.nxt = edge.next[this.direction]
      return { done: false, value: [current, edge] }
    }

    return { done: true, value: undefined }
  }

  [Symbol.iterator](): IterableIterator<[number, Edge<Edge.Data<A>>]> {
    return new EdgeWalker(this.graph, this.direction, this.nxt)
  }
}
