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
  export type NodeData<A extends Any> = A extends Graph<infer N, any> ? N : never

  /**
   * @since 3.12.0
   */
  export type EdgeData<A extends Any> = A extends Graph<any, infer E> ? E : never

  /**
   * @since 3.12.0
   */
  export type Preserve<A extends Any> = A extends Directed<infer N, infer E> ? Directed<N, E> :
    A extends Undirected<infer N, infer E> ? Undirected<N, E> :
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
  [Inspectable.NodeInspectSymbol](this: Graph<unknown, unknown>) {
    const type = isDirected(this) ? "Directed" : isUndirected(this) ? "Undirected" : ""
    return `${type}Graph(${this.nodes.length} nodes, ${this.edges.length} edges)`
  },
  toJSON(this: Graph<unknown, unknown>) {
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
  addNode(data: Graph.NodeData<A>): number

  /**
   * @since 3.12.0
   * @category combinators
   */
  addEdge(from: number, to: number, data: Graph.EdgeData<A>): Option.Option<number>

  /**
   * @since 3.12.0
   * @category combinators
   */
  updateEdge(from: number, to: number, data: Graph.EdgeData<A>): Option.Option<number>

  /**
   * @since 3.12.0
   * @category combinators
   */
  unsafeAddEdge(from: number, to: number, data: Graph.EdgeData<A>): number

  /**
   * @since 3.12.0
   * @category combinators
   */
  unsafeUpdateEdge(from: number, to: number, data: Graph.EdgeData<A>): number
}

class MutableImpl<in out A extends Graph.Any> implements Mutable<A> {
  readonly [MutableTypeId] = {
    _A: (_: any) => _
  }

  constructor(readonly graph: A) {}

  addNode(data: Graph.NodeData<A>): number {
    const node = makeNode(data, [-1, -1])
    return this.graph.nodes.push(node) - 1
  }

  addEdge(from: number, to: number, data: Graph.EdgeData<A>): Option.Option<number> {
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

  unsafeAddEdge(from: number, to: number, data: Graph.EdgeData<A>): number {
    return Option.getOrThrow(this.addEdge(from, to, data))
  }

  updateEdge(from: number, to: number, data: Graph.EdgeData<A>): Option.Option<number> {
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

  unsafeUpdateEdge(from: number, to: number, data: Graph.EdgeData<A>): number {
    return Option.getOrThrow(this.updateEdge(from, to, data))
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
  <N>(data: N): <E, A extends Graph<N, E>>(self: A) => Graph.Preserve<A>
  <N, E, A extends Graph<N, E>>(self: A, data: N): Graph.Preserve<A>
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
 * @since 3.12.0
 * @category combinators
 */
export const addEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph<any, E>>(graph: A) => Option.Option<[Graph.Preserve<A>, number]>
  <E, A extends Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Option.Option<[Graph.Preserve<A>, number]>
} = dual(4, <E, A extends Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Option.Option<[Graph.Preserve<A>, number]> => {
  let result: Option.Option<number>
  const out = mutate(graph, (mutable) => {
    result = mutable.addEdge(from, to, data as any)
  })

  /** @ts-ignore */
  return result.pipe(Option.map((index) => [out, index]))
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
  ): <A extends Graph<any, E>>(graph: A) => [Graph.Preserve<A>, number]
  <E, A extends Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): [Graph.Preserve<A>, number]
} = dual(4, <E, A extends Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): [Graph.Preserve<A>, number] => Option.getOrThrow(addEdge(graph, from, to, data)))

/**
 * @since 3.12.0
 * @category combinators
 */
export const updateEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph<any, E>>(graph: A) => Option.Option<[Graph.Preserve<A>, number]>
  <E, A extends Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Option.Option<[Graph.Preserve<A>, number]>
} = dual(4, <E, A extends Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Option.Option<[Graph.Preserve<A>, number]> => {
  let result: Option.Option<number>
  const out = mutate(graph, (mutable) => {
    result = mutable.updateEdge(from, to, data as any)
  })

  /** @ts-ignore */
  return result.pipe(Option.map((index) => [out, index]))
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
  ): <A extends Graph<any, E>>(graph: A) => [Graph.Preserve<A>, number]
  <E, A extends Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): [Graph.Preserve<A>, number]
} = dual(4, <E, A extends Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): [Graph.Preserve<A>, number] => Option.getOrThrow(updateEdge(graph, from, to, data)))

/**
 * @since 3.12.0
 * @category combinators
 */
export const containsEdge = <N, E>(
  graph: Graph<N, E>,
  a: number,
  b: number
): boolean => Option.isSome(findEdge(graph, a, b))

/**
 * @since 3.12.0
 * @category combinators
 */
export const findEdge = <N, E>(
  graph: Graph<N, E>,
  a: number,
  b: number
): Option.Option<number> => {
  if (isUndirected(graph)) {
    return findEdgeUndirected(graph, a, b).pipe(Option.map(([index]) => index))
  }

  const node = graph.nodes[a]
  return node === undefined ? Option.none() : findEdgeDirectedFromNode(graph as Graph.Directed<N, E>, node, b)
}

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
