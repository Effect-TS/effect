import * as Graph from "effect/Graph"
import type { AdapterRecipe, GraphSpec } from "./corpus.ts"
import { emptyAdapterRecipe, validateGraphSpec } from "./corpus.ts"

export type GraphEdgeData = {
  readonly id: number
  readonly weight: number
}

export type AdaptedGraph<T extends Graph.Kind> = {
  readonly graph: Graph.Graph<number, GraphEdgeData, T>
  readonly nodeIndices: ReadonlyArray<Graph.NodeIndex>
  readonly edgeIndices: ReadonlyArray<Graph.EdgeIndex>
}

const validateHoles = (holes: ReadonlyArray<number>, activeCount: number, name: string): Set<number> => {
  const total = activeCount + holes.length
  const positions = new Set<number>()
  for (const position of holes) {
    if (!Number.isSafeInteger(position) || position < 0 || position >= total || positions.has(position)) {
      throw new RangeError(`${name} must contain unique allocation positions`)
    }
    positions.add(position)
  }
  return positions
}

const populate = <T extends Graph.Kind>(
  mutable: Graph.MutableGraph<number, GraphEdgeData, T>,
  spec: GraphSpec,
  recipe: AdapterRecipe,
  nodeIndices: Array<Graph.NodeIndex>,
  edgeIndices: Array<Graph.EdgeIndex>
): void => {
  const nodeHoles = validateHoles(recipe.nodeIndexHoles, spec.nodeCount, "nodeIndexHoles")
  for (let position = 0; position < spec.nodeCount + nodeHoles.size; position++) {
    if (nodeHoles.has(position)) {
      const hole = Graph.addNode(mutable, -1)
      Graph.removeNode(mutable, hole)
    } else {
      nodeIndices.push(Graph.addNode(mutable, nodeIndices.length))
    }
  }

  const edgeHoles = validateHoles(recipe.edgeIndexHoles, spec.edges.length, "edgeIndexHoles")
  if (edgeHoles.size > 0 && nodeIndices.length === 0) {
    throw new RangeError("edgeIndexHoles require at least one node")
  }
  for (let position = 0; position < spec.edges.length + edgeHoles.size; position++) {
    if (edgeHoles.has(position)) {
      const node = nodeIndices[0]!
      const hole = Graph.addEdge(mutable, node, node, { id: -1, weight: 0 })
      Graph.removeEdge(mutable, hole)
    } else {
      const [source, target, weight, id] = spec.edges[edgeIndices.length]!
      edgeIndices.push(Graph.addEdge(mutable, nodeIndices[source]!, nodeIndices[target]!, { id, weight }))
    }
  }
}

export const adaptGraphSpec = <T extends Graph.Kind>(
  spec: GraphSpec & { readonly kind: T },
  recipe: AdapterRecipe = emptyAdapterRecipe
): AdaptedGraph<T> => {
  validateGraphSpec(spec)
  const nodeIndices: Array<Graph.NodeIndex> = []
  const edgeIndices: Array<Graph.EdgeIndex> = []
  const graph = spec.kind === "directed"
    ? Graph.directed<number, GraphEdgeData>((mutable) => {
      populate(mutable, spec, recipe, nodeIndices, edgeIndices)
      return undefined
    })
    : Graph.undirected<number, GraphEdgeData>((mutable) => {
      populate(mutable, spec, recipe, nodeIndices, edgeIndices)
      return undefined
    })
  return {
    graph: graph as Graph.Graph<number, GraphEdgeData, T>,
    nodeIndices,
    edgeIndices
  }
}
