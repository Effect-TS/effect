import { dual } from "../../Function.js"
import type * as Graph from "../../Graph.js"
import * as Inspectable from "../../Inspectable.js"
import * as Option from "../../Option.js"
import { pipeArguments } from "../../Pipeable.js"
import * as Predicate from "../../Predicate.js"
import { hasProperty } from "../../Predicate.js"

/** @internal */
export const TypeId: Graph.TypeId = Symbol.for("effect/Graph") as any

/** @internal */
export const NodeTypeId: Graph.NodeTypeId = Symbol.for("effect/GraphNode") as any

/** @internal */
export const EdgeTypeId: Graph.EdgeTypeId = Symbol.for("effect/GraphEdge") as any

/** @internal */
export const OUTGOING: Graph.Edge.Outgoing = 0

/** @internal */
export const INCOMING: Graph.Edge.Incoming = 1

/** @internal */
export const DIRECTIONS: [Graph.Edge.Outgoing, Graph.Edge.Incoming] = [OUTGOING, INCOMING]

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Inspectable.NodeInspectSymbol](this: Graph.Graph.Unknown) {
    const type = isDirected(this) ? "Directed" : isUndirected(this) ? "Undirected" : ""
    return `${type}Graph(${this.nodes.length} nodes, ${this.edges.length} edges)`
  },
  toJSON(this: Graph.Graph.Unknown) {
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
  [Inspectable.NodeInspectSymbol](this: Graph.Node.Unknown) {
    if (typeof this.data === "string") {
      return `Node(${this.data})`
    }

    return "Node(<data>)"
  },
  toJSON(this: Graph.Node.Unknown) {
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
  [Inspectable.NodeInspectSymbol](this: Graph.Edge.Unknown) {
    if (typeof this.data === "string") {
      return `Edge(${this.node[0]} -> ${this.node[1]}: ${this.data})`
    }

    return `Edge(${this.node[0]} -> ${this.node[1]}: <data>)`
  },
  toJSON(this: Graph.Edge.Unknown) {
    return {
      next: this.next,
      node: this.node,
      data: this.data
    }
  }
}

/** @internal */
export const MutableTypeId: Graph.MutableTypeId = Symbol.for("effect/GraphMutable") as any

class MutableImpl<in out A extends Graph.Graph.Any> implements Graph.Mutable<A> {
  readonly [MutableTypeId] = {
    _A: (_: any) => _
  }

  constructor(readonly graph: A) {}

  addNode(data: Graph.Node.Data<A>): number {
    const node = makeNode(data, [-1, -1])
    return this.graph.nodes.push(node) - 1
  }

  addEdge(from: number, to: number, data: Graph.Edge.Data<A>): Option.Option<number> {
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

  unsafeAddEdge(from: number, to: number, data: Graph.Edge.Data<A>): number {
    return Option.getOrThrow(this.addEdge(from, to, data))
  }

  updateEdge(from: number, to: number, data: Graph.Edge.Data<A>): Option.Option<number> {
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

  unsafeUpdateEdge(from: number, to: number, data: Graph.Edge.Data<A>): number {
    return Option.getOrThrow(this.updateEdge(from, to, data))
  }

  removeEdge(index: number): Option.Option<Graph.Edge.Data<A>> {
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

  removeNode(index: number): Option.Option<Graph.Node.Data<A>> {
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

const copy = <A extends Graph.Graph.Any>(graph: A): Graph.Graph.Preserve<A> => {
  const self = Object.create(Proto)
  self._tag = graph._tag
  self.nodes = graph.nodes.slice()
  self.edges = graph.edges.slice()
  return self
}

/** @internal */
export const mutate = <A extends Graph.Graph.Any>(
  self: A,
  fn: (mutable: Graph.Mutable<A>) => void
): Graph.Graph.Preserve<A> => {
  const mutable = new MutableImpl(copy(self))
  fn(mutable as any)
  return mutable.graph
}

/** @internal */
export const isGraph: (value: unknown) => value is Graph.Graph.Unknown = hasProperty(TypeId) as any

/** @internal */
export const isDirected: <N, E>(
  value: Graph.Graph<N, E>
) => value is Graph.Graph.Directed<N, E> = Predicate.isTagged("DirectedGraph") as any

/** @internal */
export const isUndirected: <N, E>(
  value: Graph.Graph<N, E>
) => value is Graph.Graph.Undirected<N, E> = Predicate.isTagged("UndirectedGraph") as any

const makeDirected = <N, E>(
  nodes: ReadonlyArray<Graph.Node<N>>,
  edges: ReadonlyArray<Graph.Edge<E>>
): Graph.Graph.Directed<N, E> => {
  const self = Object.create(Proto)
  self._tag = "DirectedGraph"
  self.nodes = nodes
  self.edges = edges
  return self
}

/** @internal */
export const directed = <N, E>(): Graph.Graph.Directed<N, E> => makeDirected([], [])

const makeUndirected = <N, E>(
  nodes: ReadonlyArray<Graph.Node<N>>,
  edges: ReadonlyArray<Graph.Edge<E>>
): Graph.Graph.Undirected<N, E> => {
  const self = Object.create(Proto)
  self._tag = "UndirectedGraph"
  self.nodes = nodes
  self.edges = edges
  return self
}

/** @internal */
export const undirected = <N, E>(): Graph.Graph.Undirected<N, E> => makeUndirected([], [])

const makeNode = <N>(
  data: N,
  next: [number, number]
): Graph.Node<N> => {
  const self = Object.create(ProtoNode)
  self.data = data
  self.next = next
  return self
}

/** @internal */
export const getNode: {
  <N>(index: number): (self: Graph.Graph<N, any>) => Option.Option<N>
  <N>(self: Graph.Graph<N, any>, index: number): Option.Option<N>
} = dual(2, <N>(
  graph: Graph.Graph<N, any>,
  index: number
): Option.Option<N> => Option.fromNullable(graph.nodes[index]).pipe(Option.map((node) => node.data)))

/** @internal */
export const unsafeGetNode: {
  <N>(index: number): (self: Graph.Graph<N, any>) => N
  <N>(self: Graph.Graph<N, any>, index: number): N
} = dual(2, <N>(
  graph: Graph.Graph<N, any>,
  index: number
): N => Option.getOrThrow(getNode(graph, index)))

/** @internal */
export const addNode: {
  <N>(data: N): <A extends Graph.Graph<N, any>>(self: A) => Graph.Graph.Preserve<A>
  <N, A extends Graph.Graph<N, any>>(self: A, data: N): Graph.Graph.Preserve<A>
} = dual(2, <N, E, A extends Graph.Graph<N, E>>(
  self: A,
  data: N
): Graph.Graph.Preserve<A> => mutate(self, (mutable) => mutable.addNode(data as any)))

/** @internal */
export const removeNode: {
  (node: number): <A extends Graph.Graph.Any>(self: A) => Option.Option<Graph.Graph.Preserve<A>>
  <A extends Graph.Graph.Any>(self: A, node: number): Option.Option<Graph.Graph.Preserve<A>>
} = dual(2, <A extends Graph.Graph.Any>(
  graph: A,
  node: number
): Option.Option<Graph.Graph.Preserve<A>> => {
  let data: Option.Option<Graph.Node.Data<A>>
  const out = mutate(graph, (mutable) => {
    data = mutable.removeNode(node)
  })

  return data!.pipe(Option.as(out))
})

const makeEdge = <E>(
  data: E,
  node: [number, number],
  next: [number, number]
): Graph.Edge<E> => {
  const self = Object.create(ProtoEdge)
  self.data = data
  self.next = next
  self.node = node
  return self
}

/** @internal */
export const getEdge: {
  <E>(index: number): (self: Graph.Graph<any, E>) => Option.Option<E>
  <E>(self: Graph.Graph<any, E>, index: number): Option.Option<E>
} = dual(2, <E>(
  graph: Graph.Graph<any, E>,
  index: number
): Option.Option<E> => Option.fromNullable(graph.edges[index]).pipe(Option.map((edge) => edge.data)))

/** @internal */
export const unsafeGetEdge: {
  <E>(index: number): (self: Graph.Graph<any, E>) => E
  <E>(self: Graph.Graph<any, E>, index: number): E
} = dual(2, <E>(
  graph: Graph.Graph<any, E>,
  index: number
): E => Option.getOrThrow(getEdge(graph, index)))

/** @internal */
export const addEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph.Graph<any, E>>(graph: A) => Option.Option<Graph.Graph.Preserve<A>>
  <E, A extends Graph.Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Option.Option<Graph.Graph.Preserve<A>>
} = dual(4, <E, A extends Graph.Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Option.Option<Graph.Graph.Preserve<A>> => {
  let index: Option.Option<number>
  const out = mutate(graph, (mutable) => {
    index = mutable.addEdge(from, to, data as any)
  })

  return index!.pipe(Option.as(out))
})

/** @internal */
export const unsafeAddEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph.Graph<any, E>>(graph: A) => Graph.Graph.Preserve<A>
  <E, A extends Graph.Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Graph.Graph.Preserve<A>
} = dual(4, <E, A extends Graph.Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Graph.Graph.Preserve<A> => Option.getOrThrow(addEdge(graph, from, to, data)))

/** @internal */
export const updateEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph.Graph<any, E>>(graph: A) => Option.Option<Graph.Graph.Preserve<A>>
  <E, A extends Graph.Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Option.Option<Graph.Graph.Preserve<A>>
} = dual(4, <E, A extends Graph.Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Option.Option<Graph.Graph.Preserve<A>> => {
  let index: Option.Option<number>
  const out = mutate(graph, (mutable) => {
    index = mutable.updateEdge(from, to, data as any)
  })

  return index!.pipe(Option.as(out))
})

/** @internal */
export const unsafeUpdateEdge: {
  <E>(
    from: number,
    to: number,
    data: E
  ): <A extends Graph.Graph<any, E>>(graph: A) => Graph.Graph.Preserve<A>
  <E, A extends Graph.Graph<any, E>>(
    graph: A,
    from: number,
    to: number,
    data: E
  ): Graph.Graph.Preserve<A>
} = dual(4, <E, A extends Graph.Graph<any, E>>(
  graph: A,
  from: number,
  to: number,
  data: E
): Graph.Graph.Preserve<A> => Option.getOrThrow(updateEdge(graph, from, to, data)))

/** @internal */
export const removeEdge: {
  (edge: number): <A extends Graph.Graph.Any>(self: A) => Option.Option<Graph.Graph.Preserve<A>>
  <A extends Graph.Graph.Any>(self: A, edge: number): Option.Option<Graph.Graph.Preserve<A>>
} = dual(2, <A extends Graph.Graph.Any>(
  graph: A,
  edge: number
): Option.Option<Graph.Graph.Preserve<A>> => {
  let data: Option.Option<Graph.Edge.Data<A>>
  const out = mutate(graph, (mutable) => {
    data = mutable.removeEdge(edge)
  })

  return data!.pipe(Option.as(out))
})

/** @internal */
export const containsEdge: {
  (from: number, to: number): (self: Graph.Graph.Any) => boolean
  (self: Graph.Graph.Any, from: number, to: number): boolean
} = dual(3, (
  graph: Graph.Graph.Any,
  a: number,
  b: number
): boolean => Option.isSome(findEdge(graph, a, b)))

/** @internal */
export const findEdge: {
  (from: number, to: number): (self: Graph.Graph.Any) => Option.Option<number>
  (self: Graph.Graph.Any, from: number, to: number): Option.Option<number>
} = dual(3, (
  graph: Graph.Graph.Any,
  a: number,
  b: number
): Option.Option<number> => {
  if (isUndirected(graph)) {
    return findEdgeUndirected(graph, a, b).pipe(Option.map(([index]) => index))
  }

  const node = graph.nodes[a]
  return node === undefined ? Option.none() : findEdgeDirectedFromNode(graph, node, b)
})

/** @internal */
export const map: {
  <A extends Graph.Graph.Any, N, E>(options: {
    mapNodes: (node: Graph.Node.Data<A>) => N
    mapEdges: (edge: Graph.Edge.Data<A>) => E
  }): (self: A) => Graph.Graph.Preserve<A, N, E>
  <A extends Graph.Graph.Any, N, E>(
    self: A,
    options: {
      mapNodes: (node: Graph.Node.Data<A>) => N
      mapEdges: (edge: Graph.Edge.Data<A>) => E
    }
  ): Graph.Graph.Preserve<A, N, E>
} = dual(2, <A extends Graph.Graph.Any, N, E>(self: A, {
  mapEdges,
  mapNodes
}: {
  mapNodes: (data: Graph.Node.Data<A>) => N
  mapEdges: (data: Graph.Edge.Data<A>) => E
}): Graph.Graph.Preserve<A, N, E> =>
  mutate(self, (mutable) => {
    mutable.graph.nodes = self.nodes.map((node) => makeNode(mapNodes(node.data), node.next))
    mutable.graph.edges = self.edges.map((edge) => makeEdge(mapEdges(edge.data), edge.node, edge.next))
  }) as any)

/** @internal */
export const filterMap: {
  <A extends Graph.Graph.Any, N, E>(options: {
    mapNodes: (node: Graph.Node.Data<A>) => Option.Option<N>
    mapEdges: (edge: Graph.Edge.Data<A>) => Option.Option<E>
  }): (self: A) => Graph.Graph.Preserve<A, N, E>
  <A extends Graph.Graph.Any, N, E>(
    self: A,
    options: {
      mapNodes: (node: Graph.Node.Data<A>) => Option.Option<N>
      mapEdges: (edge: Graph.Edge.Data<A>) => Option.Option<E>
    }
  ): Graph.Graph.Preserve<A, N, E>
} = dual(2, <A extends Graph.Graph.Any, N, E>(self: A, {
  mapEdges,
  mapNodes
}: {
  mapNodes: (data: Graph.Node.Data<A>) => Option.Option<N>
  mapEdges: (data: Graph.Edge.Data<A>) => Option.Option<E>
}): Graph.Graph.Preserve<A, N, E> =>
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
  }) as any)

const findEdgeDirectedFromNode = <N, E>(
  graph: Graph.Graph.Directed<N, E>,
  node: Graph.Node<N>,
  index: number
): Option.Option<number> => {
  let edix = node.next[OUTGOING]
  let edge: Graph.Edge<E>
  while ((edge = graph.edges[edix]) !== undefined) {
    if (edge.node[INCOMING] == index) {
      return Option.some(edix)
    }
    edix = edge.next[OUTGOING]
  }

  return Option.none()
}

const findEdgeUndirectedFromNode = <N, E>(
  graph: Graph.Graph.Undirected<N, E>,
  node: Graph.Node<N>,
  index: number
): Option.Option<[number, Graph.Edge.Direction]> => {
  for (const direction of DIRECTIONS) {
    let edix = node.next[direction]
    let edge: Graph.Edge<E>
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
  graph: Graph.Graph.Undirected<N, E>,
  a: number,
  b: number
): Option.Option<[number, Graph.Edge.Direction]> => {
  const an = graph.nodes[a]
  if (an === undefined) {
    return Option.none()
  }

  return findEdgeUndirectedFromNode(graph, an, b)
}

/** @internal */
export const nodes = <A extends Graph.Graph.Any>(
  graph: A
): IterableIterator<[number, Graph.Node.Data<A>]> => new NodeIterator(graph, (index, data) => [index, data] as const)

/** @internal */
export const edges = <A extends Graph.Graph.Any>(
  graph: A
): IterableIterator<[number, Graph.Edge.Data<A>]> => new EdgeIterator(graph, (index, data) => [index, data] as const)

/** @internal */
export const externals = <A extends Graph.Graph.Any>(
  graph: A,
  direction: Graph.Edge.Direction
): IterableIterator<[number, Graph.Node.Data<A>]> =>
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
const changeEdgeLinks = <A extends Graph.Graph.Any>(
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
const removeEdgeAdjustIndices = <A extends Graph.Graph.Any>(graph: A, edge: number): Graph.Edge<Graph.Edge.Data<A>> => {
  const removed = swapRemove(graph.edges, edge)
  const swap = graph.edges[edge]
  if (swap !== undefined) {
    const swapped = graph.edges.length
    changeEdgeLinks(graph, swap.node, swapped, [edge, edge])
  }
  return removed
}

class NodeIterator<in out A extends Graph.Graph.Any, out T> implements IterableIterator<T> {
  private index = 0

  constructor(
    private readonly graph: A,
    private readonly map: (index: number, data: Graph.Node.Data<A>) => T,
    private readonly filter?: (index: number, data: Graph.Node.Data<A>) => boolean
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

class EdgeIterator<in out A extends Graph.Graph.Any, out T> implements IterableIterator<T> {
  private index = 0

  constructor(
    private readonly graph: A,
    private readonly map: (index: number, data: Graph.Edge.Data<A>) => T,
    private readonly filter?: (index: number, data: Graph.Edge.Data<A>) => boolean
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

class ExternalsIterator<in out A extends Graph.Graph.Any, out T> implements IterableIterator<T> {
  private index = 0

  constructor(
    private readonly graph: A,
    private readonly direction: Graph.Edge.Direction,
    private readonly map: (index: number, data: Graph.Node.Data<A>) => T,
    private readonly filter?: (index: number, data: Graph.Node.Data<A>) => boolean
  ) {}

  next(): IteratorResult<T> {
    let node: Graph.Node<Graph.Node.Data<A>>
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

/** @internal */
export class EdgeWalker<in out A extends Graph.Graph.Any>
  implements Iterator<[number, Graph.Edge<Graph.Edge.Data<A>>]>
{
  counter = 0
  constructor(
    private readonly graph: A,
    private readonly direction: Graph.Edge.Direction,
    private nxt: number
  ) {}

  next(): IteratorResult<[number, Graph.Edge<Graph.Edge.Data<A>>]> {
    const current = this.nxt
    const edge = this.graph.edges[current]
    if (edge !== undefined) {
      this.nxt = edge.next[this.direction]
      return { done: false, value: [current, edge] }
    }

    return { done: true, value: undefined }
  }

  [Symbol.iterator](): IterableIterator<[number, Graph.Edge<Graph.Edge.Data<A>>]> {
    return new EdgeWalker(this.graph, this.direction, this.nxt)
  }
}

const defaultDotConfig = {
  edgeIndexLabel: false,
  edgeNoLabel: false,
  graphContentOnly: false,
  nodeIndexLabel: false,
  nodeNoLabel: false
}

/** @internal */
export const toDot = (
  self: Graph.Graph.Any,
  config?: {
    readonly nodeIndexLabel?: boolean | undefined
    readonly edgeIndexLabel?: boolean | undefined
    readonly edgeNoLabel?: boolean | undefined
    readonly nodeNoLabel?: boolean | undefined
    readonly graphContentOnly?: boolean | undefined
  } | undefined
): string => {
  const {
    edgeIndexLabel,
    edgeNoLabel,
    graphContentOnly,
    nodeIndexLabel,
    nodeNoLabel
  } = Object.assign({}, defaultDotConfig, config)

  const indent = "    "
  const lines: Array<string> = []
  const type = isDirected(self) ? "digraph" : "graph"
  const op = isDirected(self) ? "->" : "--"

  if (!graphContentOnly) {
    lines.push(`${type} {`)
  }

  for (const [index, data] of nodes(self)) {
    let line = `${indent}${index} [ `
    if (!nodeNoLabel) {
      const label = nodeIndexLabel ? `${index}` : escapeLabel(String(data))
      line += `label = "${label}" `
    }
    lines.push(`${line}]`)
  }

  for (const [index, data] of edges(self)) {
    const edge = self.edges[index]
    const [from, to] = edge.node
    let line = `${indent}${from} ${op} ${to} [ `
    if (!edgeNoLabel) {
      const label = edgeIndexLabel ? `${index}` : escapeLabel(String(data))
      line += `label = "${label}" `
    }
    lines.push(`${line}]`)
  }

  if (!graphContentOnly) {
    lines.push("}")
  }

  return lines.join("\n") + "\n"
}

const escapeLabel = (str: string): string => str.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\l")
