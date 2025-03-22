/**
 * @since 3.12.0
 */
import type * as Inspectable from "./Inspectable.js"
import * as internal from "./internal/graph/graph.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Types from "./Types.js"

/**
 * @since 3.12.0
 * @category symbols
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 3.12.0
 * @category symbols
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
 * @category symbols
 */
export const NodeTypeId: unique symbol = internal.NodeTypeId

/**
 * @since 3.12.0
 * @category symbols
 */
export type NodeTypeId = typeof NodeTypeId

/**
 * @since 3.12.0
 * @category models
 */
export interface Node<in out N> extends Pipeable, Inspectable.Inspectable, Node.Variance<N> {
  /** @internal */
  readonly data: N
  /** @internal */
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
 * @category symbols
 */
export const EdgeTypeId: unique symbol = internal.EdgeTypeId

/**
 * @since 3.12.0
 * @category symbols
 */
export type EdgeTypeId = typeof EdgeTypeId

/**
 * @since 3.12.0
 * @category models
 */
export interface Edge<in out E> extends Pipeable, Inspectable.Inspectable, Edge.Variance<E> {
  /** @internal */
  readonly data: E
  /** @internal */
  readonly next: [number, number]
  /** @internal */
  readonly node: [number, number]
}

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

/**
 * @since 3.12.0
 * @category symbols
 */
export const MutableTypeId: unique symbol = internal.MutableTypeId

/**
 * @since 3.12.0
 * @category symbols
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
  removeNode(node: number): Option.Option<Node.Data<A>>

  /**
   * @since 3.12.0
   * @category combinators
   */
  addEdge(from: number, to: number, data: Edge.Data<A>): Option.Option<number>

  /**
   * @since 3.12.0
   * @category combinators
   */
  unsafeAddEdge(from: number, to: number, data: Edge.Data<A>): number

  /**
   * @since 3.12.0
   * @category combinators
   */
  updateEdge(from: number, to: number, data: Edge.Data<A>): Option.Option<number>

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
}

/**
 * @since 3.12.0
 * @category combinators
 */
export const isGraph: (u: unknown) => u is Graph.Unknown = internal.isGraph

/**
 * @since 3.12.0
 * @category combinators
 */
export const isDirected: <A, E>(u: Graph<A, E>) => u is Graph.Directed<A, E> = internal.isDirected

/**
 * @since 3.12.0
 * @category combinators
 */
export const isUndirected: <A, E>(u: Graph<A, E>) => u is Graph.Undirected<A, E> = internal.isUndirected

/**
 * @since 3.12.0
 * @category constructors
 */
export const directed: <N, E>() => Graph.Directed<N, E> = internal.directed

/**
 * @since 3.12.0
 * @category constructors
 */
export const undirected: <N, E>() => Graph.Undirected<N, E> = internal.undirected

/**
 * @since 3.12.0
 * @category constructors
 */
export const mutate: <A extends Graph.Any>(
  self: A,
  fn: (mutable: Mutable<A>) => void
) => Graph.Preserve<A> = internal.mutate

/**
 * @since 3.12.0
 * @category combinators
 */
export const nodes: <A extends Graph.Any>(graph: A) => IterableIterator<[number, Node.Data<A>]> = internal.nodes

/**
 * @since 3.12.0
 * @category combinators
 */
export const edges: <A extends Graph.Any>(graph: A) => IterableIterator<[number, Edge.Data<A>]> = internal.edges

/**
 * @since 3.12.0
 * @category combinators
 */
export const externals: <A extends Graph.Any>(
  graph: A,
  direction: Edge.Direction
) => IterableIterator<[number, Node.Data<A>]> = internal.externals

/**
 * @since 3.12.0
 * @category combinators
 */
export const getNode: {
  <N>(index: number): (self: Graph<N, any>) => Option.Option<N>
  <N>(self: Graph<N, any>, index: number): Option.Option<N>
} = internal.getNode

/**
 * @since 3.12.0
 * @category combinators
 */
export const addNode: {
  <N, A extends Graph<N, any>>(data: N): (self: A) => Graph.Preserve<A>
  <N, A extends Graph<N, any>>(self: A, data: N): Graph.Preserve<A>
} = internal.addNode

/**
 * @since 3.12.0
 * @category combinators
 */
export const removeNode: {
  (node: number): <A extends Graph.Any>(self: A) => Option.Option<Graph.Preserve<A>>
  <A extends Graph.Any>(self: A, node: number): Option.Option<Graph.Preserve<A>>
} = internal.removeNode

/**
 * @since 3.12.0
 * @category combinators
 */
export const getEdge: {
  <N, E>(from: number, to: number): (self: Graph<N, E>) => Option.Option<E>
  <N, E>(self: Graph<N, E>, from: number, to: number): Option.Option<E>
} = internal.getEdge

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
  <E, A extends Graph<any, E>>(from: number, to: number, data: E): (self: A) => Option.Option<Graph.Preserve<A>>
  <E, A extends Graph<any, E>>(self: A, from: number, to: number, data: E): Option.Option<Graph.Preserve<A>>
} = internal.addEdge

/**
 * @since 3.12.0
 * @category combinators
 */
export const updateEdge: {
  <E, A extends Graph<any, E>>(from: number, to: number, data: E): (self: A) => Option.Option<Graph.Preserve<A>>
  <E, A extends Graph<any, E>>(self: A, from: number, to: number, data: E): Option.Option<Graph.Preserve<A>>
} = internal.updateEdge

/**
 * @since 3.12.0
 * @category combinators
 */
export const removeEdge: {
  (edge: number): <A extends Graph.Any>(self: A) => Option.Option<Graph.Preserve<A>>
  <A extends Graph.Any>(self: A, edge: number): Option.Option<Graph.Preserve<A>>
} = internal.removeEdge

/**
 * Lookup an edge from `a` to `b`.
 *
 * Computes in `O(e)` time, where `e` is the number of edges connected to
 * `a` (and `b`, if the graph edges are undirected).
 *
 * @since 3.12.0
 * @category combinators
 */
export const findEdge: {
  (from: number, to: number): (self: Graph.Any) => Option.Option<number>
  (self: Graph.Any, from: number, to: number): Option.Option<number>
} = internal.findEdge

/**
 * Lookup if there is an edge from `a` to `b`.
 *
 * Computes in `O(e)` time, where `e` is the number of edges connected
 * to `a` (and `b`, if the graph edges are undirected).
 *
 * @since 3.12.0
 * @category combinators
 */
export const containsEdge: {
  (from: number, to: number): (self: Graph.Any) => boolean
  (self: Graph.Any, from: number, to: number): boolean
} = internal.containsEdge

/**
 * Create a new `Graph` by mapping node and edge weights to new values.
 *
 * The resulting graph has the same structure and the same graph indices
 * as `self`.
 *
 * @since 3.12.0
 * @category combinators
 */
export const map: {
  <A extends Graph.Any, N, E>(options: {
    mapNodes: (node: Node.Data<A>) => N
    mapEdges: (edge: Edge.Data<A>) => E
  }): (self: A) => Graph.Preserve<A, N, E>
  <A extends Graph.Any, N, E>(
    self: A,
    options: {
      mapNodes: (node: Node.Data<A>) => N
      mapEdges: (edge: Edge.Data<A>) => E
    }
  ): Graph.Preserve<A, N, E>
} = internal.map

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
export const filterMap: {
  <A extends Graph.Any, N, E>(options: {
    mapNodes: (node: Node.Data<A>) => Option.Option<N>
    mapEdges: (edge: Edge.Data<A>) => Option.Option<E>
  }): (self: A) => Graph.Preserve<A, N, E>
  <A extends Graph.Any, N, E>(
    self: A,
    options: {
      mapNodes: (node: Node.Data<A>) => Option.Option<N>
      mapEdges: (edge: Edge.Data<A>) => Option.Option<E>
    }
  ): Graph.Preserve<A, N, E>
} = internal.filterMap

/**
 * Formats the graph in GraphViz DOT language format.
 *
 * @see https://graphviz.org/doc/info/lang.html
 *
 * @since 3.12.0
 * @category combinators
 */
export const toDot: (
  self: Graph.Any,
  config?: {
    readonly nodeIndexLabel?: boolean | undefined
    readonly edgeIndexLabel?: boolean | undefined
    readonly edgeNoLabel?: boolean | undefined
    readonly nodeNoLabel?: boolean | undefined
    readonly graphContentOnly?: boolean | undefined
  }
) => string = internal.toDot
