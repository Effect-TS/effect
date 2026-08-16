import { createHash } from "node:crypto"

export type GraphSpec = {
  readonly name: string
  readonly seed: number
  readonly kind: "directed" | "undirected"
  readonly nodeCount: number
  readonly edges: ReadonlyArray<readonly [source: number, target: number, weight: number, id: number]>
}

export type GraphShape =
  | "chain"
  | "starIn"
  | "starOut"
  | "grid"
  | "layeredDag"
  | "dense"
  | "loopHeavy"
  | "parallelChain"
  | "disconnected"
  | "churnedSparse"

export type GraphFixtureFamily = "oracleSimple" | "effectRich"

export type GraphSize = keyof typeof graphSizes

export type AdapterRecipe = {
  readonly nodeIndexHoles: ReadonlyArray<number>
  readonly edgeIndexHoles: ReadonlyArray<number>
}

export type GraphFixture = {
  readonly family: GraphFixtureFamily
  readonly shape: GraphShape
  readonly size: GraphSize
  readonly spec: GraphSpec
  readonly fingerprint: string
  readonly adapterRecipe: AdapterRecipe
}

export const graphSizes = {
  tiny: 8,
  small: 24,
  unit: 64
} as const

export const smokeSeeds = [3, 7, 13, 21, 34, 55, 89, 144] as const

export const emptyAdapterRecipe: AdapterRecipe = {
  nodeIndexHoles: [],
  edgeIndexHoles: []
}

export const makePrng = (seed: number): () => number => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return (value ^ value >>> 14) >>> 0
  }
}

const assertNonNegativeInteger = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`)
  }
}

export const validateGraphSpec = (spec: GraphSpec): void => {
  assertNonNegativeInteger(spec.seed, "seed")
  assertNonNegativeInteger(spec.nodeCount, "nodeCount")
  const ids = new Set<number>()
  for (const [source, target, weight, id] of spec.edges) {
    if (!Number.isSafeInteger(source) || source < 0 || source >= spec.nodeCount) {
      throw new RangeError(`edge ${id} has an invalid source`)
    }
    if (!Number.isSafeInteger(target) || target < 0 || target >= spec.nodeCount) {
      throw new RangeError(`edge ${id} has an invalid target`)
    }
    if (!Number.isSafeInteger(weight)) {
      throw new RangeError(`edge ${id} has an invalid weight`)
    }
    assertNonNegativeInteger(id, "edge id")
    if (ids.has(id)) {
      throw new RangeError(`duplicate edge id ${id}`)
    }
    ids.add(id)
  }
}

const canonicalSpec = (spec: GraphSpec): string =>
  JSON.stringify([spec.name, spec.seed, spec.kind, spec.nodeCount, spec.edges])

export const fingerprintGraphSpec = (spec: GraphSpec): string =>
  createHash("sha256").update(canonicalSpec(spec)).digest("hex")

const richShapes = new Set<GraphShape>(["loopHeavy", "parallelChain", "churnedSparse"])

const makeSparseChurnRecipe = (nodeCount: number, edgeCount: number, seed: number): AdapterRecipe => {
  const random = makePrng(seed ^ 0xa511e9b3)
  const holes = (activeCount: number, requested: number): ReadonlyArray<number> => {
    const total = activeCount + requested
    const positions = new Set<number>()
    while (positions.size < requested) {
      positions.add(random() % total)
    }
    return Array.from(positions).sort((left, right) => left - right)
  }
  return {
    nodeIndexHoles: holes(nodeCount, Math.max(1, Math.floor(nodeCount / 4))),
    edgeIndexHoles: holes(edgeCount, Math.max(1, Math.floor(edgeCount / 4)))
  }
}

export const makeGraphSpec = (options: {
  readonly shape: GraphShape
  readonly nodeCount: number
  readonly seed: number
  readonly kind: GraphSpec["kind"]
  readonly name?: string
}): GraphSpec => {
  const { kind, nodeCount, seed, shape } = options
  assertNonNegativeInteger(seed, "seed")
  assertNonNegativeInteger(nodeCount, "nodeCount")
  const random = makePrng(seed)
  const edges: Array<readonly [number, number, number, number]> = []
  const keys = new Set<string>()
  const weight = (): number => random() % 9 + 1
  const add = (source: number, target: number, edgeWeight?: number, simple: boolean = false): void => {
    const key = kind === "undirected" && source > target ? `${target}:${source}` : `${source}:${target}`
    if (simple && keys.has(key)) {
      return
    }
    keys.add(key)
    edges.push([source, target, edgeWeight ?? weight(), edges.length])
  }

  switch (shape) {
    case "chain":
      for (let node = 1; node < nodeCount; node++) add(node - 1, node)
      break
    case "starIn":
      for (let node = 1; node < nodeCount; node++) add(node, 0)
      break
    case "starOut":
      for (let node = 1; node < nodeCount; node++) add(0, node)
      break
    case "grid": {
      const width = Math.max(1, Math.ceil(Math.sqrt(nodeCount)))
      for (let node = 0; node < nodeCount; node++) {
        if (node % width + 1 < width && node + 1 < nodeCount) add(node, node + 1)
        if (node + width < nodeCount) add(node, node + width)
      }
      break
    }
    case "layeredDag": {
      const width = Math.max(2, Math.ceil(Math.sqrt(nodeCount)))
      for (let source = 0; source < nodeCount; source++) {
        const nextLayer = Math.floor(source / width) + 1
        for (let offset = 0; offset < 2; offset++) {
          const target = nextLayer * width + (source + offset) % width
          if (target < nodeCount) add(source, target, undefined, true)
        }
        const skipTarget = (nextLayer + 1) * width + random() % width
        if (skipTarget < nodeCount) add(source, skipTarget, undefined, true)
      }
      break
    }
    case "dense":
      for (let source = 0; source < nodeCount; source++) {
        const firstTarget = kind === "undirected" ? source + 1 : 0
        for (let target = firstTarget; target < nodeCount; target++) {
          if (source !== target) add(source, target)
        }
      }
      break
    case "loopHeavy":
      for (let node = 1; node < nodeCount; node++) add(node - 1, node)
      for (let node = 0; node < nodeCount; node += 2) add(node, node)
      break
    case "parallelChain":
      for (let node = 1; node < nodeCount; node++) {
        const repeatedWeight = weight()
        add(node - 1, node, repeatedWeight)
        add(node - 1, node, repeatedWeight)
        add(node - 1, node)
      }
      break
    case "disconnected":
      for (let node = 1; node < nodeCount; node++) {
        if (node % 4 !== 0 && node % 4 !== 3) add(node - 1, node)
      }
      break
    case "churnedSparse": {
      for (let node = 1; node < nodeCount; node++) add(node - 1, node, undefined, true)
      const possibleEdges = nodeCount * Math.max(0, nodeCount - 1) / (kind === "undirected" ? 2 : 1)
      const targetCount = Math.min(nodeCount * 2, possibleEdges)
      if (nodeCount > 1) {
        while (edges.length < targetCount) {
          const source = random() % nodeCount
          const target = random() % nodeCount
          if (source !== target) add(source, target, undefined, true)
        }
      }
      break
    }
  }

  const spec: GraphSpec = {
    name: options.name ?? `${shape}/${nodeCount}/${kind}/${seed}`,
    seed,
    kind,
    nodeCount,
    edges
  }
  validateGraphSpec(spec)
  return spec
}

export const makeGraphFixture = (options: {
  readonly shape: GraphShape
  readonly size: GraphSize
  readonly seed: number
  readonly kind: GraphSpec["kind"]
}): GraphFixture => {
  const family = richShapes.has(options.shape) ? "effectRich" : "oracleSimple"
  const spec = makeGraphSpec({
    ...options,
    nodeCount: graphSizes[options.size],
    name: `${family}/${options.shape}/${options.size}/${options.kind}/${options.seed}`
  })
  const adapterRecipe = options.shape === "churnedSparse"
    ? makeSparseChurnRecipe(spec.nodeCount, spec.edges.length, spec.seed)
    : emptyAdapterRecipe
  return {
    family,
    shape: options.shape,
    size: options.size,
    spec,
    fingerprint: fingerprintGraphSpec(spec),
    adapterRecipe
  }
}

const corpusShapes: ReadonlyArray<GraphShape> = [
  "chain",
  "starIn",
  "starOut",
  "grid",
  "layeredDag",
  "dense",
  "loopHeavy",
  "parallelChain",
  "disconnected",
  "churnedSparse"
]

export const graphCorpus: ReadonlyArray<GraphFixture> = corpusShapes.flatMap((shape, index) =>
  (["directed", "undirected"] as const).map((kind) =>
    makeGraphFixture({ shape, size: "tiny", seed: smokeSeeds[index % smokeSeeds.length], kind })
  )
)
