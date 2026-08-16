# Plan 09: Graph Generators

## Status and Goal

Add a small set of predictable graph constructors for examples, simulations, and analytics, while giving the
verification suites a separate deterministic fixture builder capable of producing structures that production
generators intentionally exclude.

This is additive work. Existing `Graph.directed`, `Graph.undirected`, scoped mutation, automatic monotonic numeric
`NodeIndex` / `EdgeIndex` allocation, parallel-edge support, and self-loop support remain unchanged.

Binding decision: deterministic and stochastic public generators live in the existing `Graph` module. Stochastic
generators are Effect-returning and consume the existing `Random` service. The resulting Graph-module dependency and
bundle impact are accepted subject to the normal bundle comparison; do not create a separate generator module.

Success means:

- users can construct standard directed or undirected graph families without manually managing indexes;
- stochastic public generators compose with Effect's `Random` service and are reproducible with `Random.withSeed`;
- tests, differential oracles, and benchmarks share deterministic fixture builders that can exercise multigraph and
  sparse-index behavior;
- every generator has explicit edge-count, ordering, validation, and complexity contracts.

## Dependencies and Ownership

- Requires plan 01's correctness contracts for loop, parallel-edge, degree, and ordering semantics.
- Requires and consumes plan 02's shared seeded fixture model, oracle adapters, seed reporting, and benchmark fixture
  catalog; it must not create a second fixture representation or PRNG.
- Uses the existing `Graph.make(type)`, `Graph.addNode`, and `Graph.addEdge` mutation path. Generator code must not
  write `GraphImpl`, adjacency maps, allocator counters, or the acyclic cache directly.
- Can implement deterministic production generators before analytics algorithms land. Random production generators
  should wait for the plan-02 random-source helper so tests and benchmarks consume random values identically.
- Coordinate benchmark sizes and topology names with the analytics plan. Analytics owns algorithm benchmarks;
  plan 02 owns fixture construction and caching; this plan owns public generator behavior.
- No dependency on dense snapshots is required. Generated graphs start dense; only internal fixtures deliberately
  make public indexes sparse.

Plan 02 is the binding owner of the neutral `GraphSpec` corpus, seeded PRNG, adapters, fingerprints, and replay metadata.
This plan consumes that foundation and does not define alternate fixture helper names or representations.

## Design Decisions

### Production and Verification Are Different Surfaces

Public production generators create conventional simple graphs: no self-loops and no parallel edges unless the
mathematical family explicitly requires otherwise. Their shape, insertion order, and edge count are documented and
stable.

Internal fixtures must not be implemented by adding pathological switches to every public generator. They need a
single lower-level builder supporting loops, parallel edges, deleted indexes, arbitrary payloads, random weights,
and exact replay from a seed. This keeps user APIs understandable and lets verification cover the full existing Graph
model.

### Random APIs Are Effectful, Not Pure Seeded Functions

Deterministic families remain synchronous. Stochastic public generators return `Effect.Effect<Graph<...>>` and draw
from the active `Random.Random` service. A caller obtains deterministic output with:

```ts
Graph.erdosRenyi("undirected", 100, 0.05).pipe(Random.withSeed("example"))
```

Do not add `seed` options to public graph generators and do not embed Mulberry32 or another graph-specific PRNG.
Effect already provides replaceable pseudo-random generation and `Random.withSeed(string | number)`. This decision:

- avoids `Math.random` in deterministic use;
- supports reproducible tests and simulations without exposing a second PRNG contract;
- permits applications to provide their own `Random` service;
- preserves the README rule that existing synchronous APIs stay synchronous while Effect variants are additive.

The default `Random` service currently uses `Math.random`; therefore an unseeded stochastic call is intentionally
nondeterministic. The API itself never calls `Math.random`, and deterministic documentation/tests always provide a
seed. Randomness is not cryptographically secure and the JSDoc must say so.

Implementation should acquire the active random service once and run the synchronous construction kernel with its
`nextDoubleUnsafe`, rather than constructing one Effect per candidate edge. Any reusable service-access helper belongs
with plan 02 or `Random`, not as a second generator-only service.

### IDs, Types, Payloads, and Ordering

- Every graph is built in one `Graph.make(type)` mutation scope.
- Nodes are added in semantic position order and receive automatic indexes `0..n-1`.
- Edges are added in the documented enumeration order and receive automatic indexes `0..m-1`.
- Payload factories receive semantic positions/indexes but cannot supply graph IDs. Returned factory values are node
  or edge data only.
- The `type` literal is generic and is preserved as `Graph<N, E, T>`; fixed directed-only generators return
  `DirectedGraph<N, E>`.
- Default node data is its zero-based position and default edge data is `undefined`, producing
  `Graph<number, void, T>` without requiring callbacks.
- Factories are called exactly once per emitted node or edge, after configuration validation. If a factory throws,
  the exception is not wrapped.

Use small exported context types rather than positional callback arguments where a family has coordinates or ranks:

```ts
export interface GeneratedEdge {
  readonly index: number
  readonly source: NodeIndex
  readonly target: NodeIndex
}

export interface GeneratorOptions<N = number, E = void> {
  readonly node?: (index: NodeIndex) => N
  readonly edge?: (edge: GeneratedEdge) => E
}

export interface GridNode {
  readonly index: NodeIndex
  readonly row: number
  readonly column: number
}

export interface GridGeneratorOptions<N = GridNode, E = void> {
  readonly node?: (node: GridNode) => N
  readonly edge?: (edge: GeneratedEdge) => E
}
```

`GeneratedEdge.index` is the insertion ordinal and therefore equals the initial automatic `EdgeIndex`; it is not a
facility for overriding the ID. Grid's default node payload should be `GridNode`, because flattening a cell to only a
number discards useful public information.

## Proposed Public API

Exact naming should receive the normal API review, but prefer concise names in the existing `Graph` module rather
than a new package or class.

```ts
export const complete: <T extends Kind, N = number, E = void>(
  type: T,
  nodeCount: number,
  options?: GeneratorOptions<N, E>
) => Graph<N, E, T>

export const path: <T extends Kind, N = number, E = void>(
  type: T,
  nodeCount: number,
  options?: GeneratorOptions<N, E>
) => Graph<N, E, T>

export const cycle: <T extends Kind, N = number, E = void>(
  type: T,
  nodeCount: number,
  options?: GeneratorOptions<N, E>
) => Graph<N, E, T>

export const grid: <T extends Kind, N = GridNode, E = void>(
  type: T,
  rows: number,
  columns: number,
  options?: GridGeneratorOptions<N, E>
) => Graph<N, E, T>

export const tree: <T extends Kind, N = number, E = void>(
  type: T,
  nodeCount: number,
  branchingFactor: number,
  options?: GeneratorOptions<N, E>
) => Graph<N, E, T>

export const erdosRenyi: <T extends Kind, N = number, E = void>(
  type: T,
  nodeCount: number,
  probability: number,
  options?: GeneratorOptions<N, E>
) => Effect.Effect<Graph<N, E, T>>

export const connectedRandom: <T extends Kind, N = number, E = void>(
  type: T,
  nodeCount: number,
  edgeCount: number,
  options?: GeneratorOptions<N, E>
) => Effect.Effect<Graph<N, E, T>>

export const dag: <N = number, E = void>(
  nodeCount: number,
  probability: number,
  options?: GeneratorOptions<N, E>
) => Effect.Effect<DirectedGraph<N, E>>
```

These are constructors, not dual graph transforms, so data-first/data-last overloads do not apply.

### Complete

- Undirected: emit one edge `(i, j)` for each `i < j`; edge count `n(n - 1) / 2`.
- Directed: emit every ordered edge `(i, j)` where `i !== j`; edge count `n(n - 1)`.
- No loops or parallel edges.
- Complexity: `Theta(n + m)` time and graph storage, which is `Theta(n^2)` for nontrivial complete graphs.

### Path and Cycle

- `path` emits `(i, i + 1)` for `i = 0..n-2`. Directed paths point from lower to higher index. Edge count is
  `max(0, n - 1)`.
- `cycle` emits the path edges followed by `(n - 1, 0)`. Require `n >= 3`; this avoids presenting a one-node loop or
  two parallel undirected edges as the conventional simple cycle `C_n`. Edge count is exactly `n`.
- Complexity: `Theta(n)` time and storage.

### Grid

- Add cells in row-major order.
- For each cell in row-major order, emit its right edge first and down edge second when those neighbors exist.
- Directed grids point right and down and are DAGs. Undirected grids have the same edge occurrences without direction.
- Node count is `rows * columns`; edge count is `rows * max(0, columns - 1) + columns * max(0, rows - 1)`.
- Zero in either dimension produces an empty graph. A `1 x n` or `n x 1` grid is a path.
- Complexity: `Theta(rows * columns)` time and storage.

### Tree

`tree` means a deterministic breadth-first complete k-ary tree, not an arbitrary tree parser and not a random tree.
For node `i > 0`, its parent is `floor((i - 1) / branchingFactor)`. Directed edges point parent-to-child; undirected
graphs contain the same edge occurrences. Edge count is `max(0, n - 1)`. Complexity is `Theta(n)`.

This definition gives examples and benchmarks a stable balanced-ish tree while leaving arbitrary parent relations to
normal graph construction.

### Erdős-Rényi `G(n, p)`

- Undirected: independently test each unordered pair `i < j` in complete-graph order.
- Directed: independently test each ordered pair `i !== j` in complete-graph order.
- Emit the edge when `nextDouble < probability`; no loops or parallel edges.
- Edge count is random, in `[0, M]`, with expectation `pM`, where `M` is the corresponding complete edge count.
- `p = 0` consumes no random values and returns no edges; `p = 1` consumes no random values and delegates to the same
  deterministic kernel as `complete`. This makes boundary behavior independent of PRNG quirks.
- Complexity: `Theta(n^2 + m)` time and `Theta(n + m)` graph storage. The pair scan is inherent to `G(n, p)`.

### Exact-Edge Connected Random Graph

- The result is connected for undirected graphs and **weakly connected** for directed graphs. JSDoc and the function
  name description must not imply strong connectivity.
- For `n > 1`, first generate a random spanning tree using a seeded Fisher-Yates node permutation and one random
  earlier parent per subsequent node. In directed mode independently orient each tree edge.
- Sample remaining simple non-loop pairs without replacement until exactly `edgeCount` edges exist. Directed graphs
  treat `(u, v)` and `(v, u)` as distinct; undirected graphs do not.
- The distribution is a spanning-tree-plus-extra-edges model, **not** uniform over all connected graphs.
- Valid range is `0` for `n = 0`; `0..0` for `n = 1`; otherwise `n - 1 <= edgeCount <= M`.
- Use an adaptive integer-pair sampler: rejection sampling while sparse, and complement/enumeration when dense. Never
  use a capped retry loop that can silently return fewer edges.
- Expected complexity is `O(n + m)` for sparse outputs and `O(M)` for dense outputs, with `O(n + min(m, M - m))`
  temporary sampling storage in addition to the graph.

### Random DAG

- Shuffle node indexes to obtain a hidden topological rank.
- Independently test each forward rank pair and emit only rank-lower to rank-higher edges.
- Edge count is random in `[0, n(n - 1) / 2]`, with expectation `p * n(n - 1) / 2`.
- The insertion/index order remains `0..n-1`; topological order is deliberately not always index order, making the
  generator useful for algorithm verification.
- No loops or parallel edges. Complexity is `Theta(n^2 + m)` time and `Theta(n + m)` storage.

## Deferred Network Models

Do not initially export Watts-Strogatz or Barabási-Albert generators.

Both are valuable topology classes for centrality, community, clustering, and path-length benchmarks, so plan 02
should include stable internal fixtures for them. They do not yet justify permanent production APIs:

- Watts-Strogatz variants disagree about the initial lattice, which endpoint is rewired, whether failed rewires keep
  the old edge, and whether connectivity is guaranteed.
- Barabási-Albert variants disagree about seed size/shape, zero-degree handling, and whether attachment samples are
  simultaneous or degree-updating.
- The reference implementation's Barabási-Albert `m`-node seed and claimed minimum degree are inconsistent for the
  initial seed (`K_m` has degree `m - 1`), illustrating why its contract needs more review.

Promote either model only after at least two analytics benchmarks or user-facing examples need it, its exact variant
is documented, and deterministic cross-seed properties exist. Promotion would be additive and require its own API
review and changeset. Internal benchmark names should include the variant, for example
`wattsStrogatzRewireSource` and `barabasiAlbertCompleteSeed`.

## Validation and Failure Behavior

Validate the complete configuration before calling payload factories or consuming randomness. Invalid structural or
algorithmic inputs throw `GraphError`, matching the Graph module's synchronous invalid-input convention; stochastic
functions create an Effect that defects with that `GraphError` when run rather than adding a new typed error channel.

- Counts and dimensions must be finite non-negative safe integers.
- Products and complete edge counts must remain safe integers; reject configurations whose automatic indexes or loop
  bounds would exceed `Number.MAX_SAFE_INTEGER` before allocation.
- `branchingFactor` must be a positive safe integer when `nodeCount > 1`. Accept any positive value for zero/one-node
  trees because it does not affect shape; rejecting zero remains simpler and consistent.
- Probabilities must be finite numbers in `[0, 1]`; `NaN` is invalid.
- `cycle` requires at least three nodes.
- `connectedRandom` validates the exact edge-count range described above.

Error messages name the generator, field, received value, and expected range. Do not clamp, round, silently truncate,
or return a partial graph.

## Internal Fixture Builder (Plan 02)

All generator tests, differential checks, and benchmarks use plan 02's neutral `GraphSpec`, fixed seed corpus, PRNG,
Effect adapter, and oracle adapters. Rich specs cover allocation/removal sequences needed for sparse active indexes,
self-loops, parallel edges, and signed/zero weights; simple specs exclude unsupported semantics before oracle adaptation.
Fast-check may shrink serializable neutral descriptions, but it must hydrate through the same adapters and report plan
02 replay metadata. Do not add an Effect-`Random` fixture model beside this corpus. Public stochastic generators still
use the `Random` service as specified above; tests record their realized topology as a neutral spec when sharing it with
oracles or benchmarks.

## Tests and Properties

Add focused runtime tests in `packages/effect/test/Graph.test.ts` unless the file's size warrants a dedicated
`GraphGenerators.test.ts`, plus type tests for kind preservation and callback inference.

Deterministic generator tests:

- zero, one, and representative sizes; invalid integers, unsafe counts, overflow, and cycle sizes;
- exact node/edge formulas and documented insertion order;
- directed versus undirected complete, path, grid, and tree endpoint semantics;
- grid coordinates and tree parent formula;
- payload factories called once in order and not called on invalid configuration;
- returned IDs are automatic contiguous indexes with no caller-supplied ID path;
- structural properties: path/tree connected and acyclic, cycle cyclic, directed grid acyclic, expected degrees.

Stochastic generator tests, always under `Random.withSeed`:

- same seed and options produce equal graphs and callback payloads; representative different seeds change topology;
- `G(n, 0)` is empty and `G(n, 1)` equals `complete` without consuming random draws;
- Erdős-Rényi output is simple, loop-free, kind-correct, and within bounds;
- connected random output has exactly the requested edge count and is connected/weakly connected for sparse,
  mid-density, and complete bounds;
- DAG output is simple and acyclic, including seeds whose topological order differs from index order;
- a custom `Random` service with a counted sequence verifies draw order and boundary draw counts;
- invalid stochastic configurations consume no random values and do not invoke factories.

Property and differential tests:

- generated endpoints always exist and every edge occurrence has a unique automatic `EdgeIndex`;
- complete edge counts and degree formulas hold over bounded random sizes;
- connected exact-edge generation terminates and reaches the requested count near maximum density;
- fixture options independently cover loops, parallel edges, zero/negative weights, and sparse node/edge indexes;
- sparse fixtures preserve monotonic allocator behavior after subsequent public `addNode` / `addEdge` calls;
- simple fixture normalization has identical nodes, endpoints, direction, and weights in each oracle;
- failures report a directly replayable seed.

Avoid statistical tests with flaky distribution thresholds. Test deterministic invariants and fixed random streams;
distribution smoke tests, if any, use broad deterministic aggregate bounds over a fixed seed corpus.

## Benchmarks

Plan 02 should cache or construct outside the timed region a stable fixture matrix containing:

- path, cycle, balanced tree, and grid for sparse/local algorithms;
- complete and dense Erdős-Rényi for quadratic/dense behavior;
- weakly connected sparse random directed and undirected graphs;
- random DAGs for topological and dependency analytics;
- internal Watts-Strogatz for clustering/community behavior;
- internal Barabási-Albert for degree-skew and centrality behavior;
- rich multigraph fixtures with loops/parallel edges and sparse indexes for correctness/performance regression checks.

Each benchmark records generator name, normalized parameters, seed, live `V`/`E`, allocated slots, graph kind, and
weight policy. Analytics benchmarks must not time random generation and must not substitute only friendly production
generators for pathological fixtures. Public generator microbenchmarks should separately measure construction cost at
sparse and dense scales.

## Documentation and Release Work

- Add public JSDoc under `@category constructors`, including formulas, kind semantics, ordering, failure behavior,
  randomness/security caveats, complexity, and deterministic `Random.withSeed` examples.
- Update Graph module documentation with a short "standard and random generators" section. Do not expose internal
  fixture helpers in user documentation.
- Mark runnable examples with `import.meta.vitest`; seed every stochastic example and assert semantic graph values.
- Add one `effect` minor changeset for the new exported constructor APIs. Internal fixtures and benchmarks do not need
  a changeset.
- Run `pnpm codegen` only if module/barrel exports change; functions added to the existing `Graph.ts` namespace should
  flow through the existing generated `effect` barrel without a new module.

## Implementation Sequence

1. Reconcile plan-02 fixture/random-source ownership and names; verify one seeded stream can drive Graph construction,
   differential normalization, and benchmark metadata.
2. Add shared validation and payload context types, then complete/path/cycle/grid/tree through public mutation APIs.
3. Add exact terminating pair-sampling kernels and the three Effect/Random generators.
4. Add runtime, type, deterministic-seed, boundary, property, and differential tests.
5. Add internal Watts-Strogatz and Barabási-Albert benchmark fixtures only after their variant contracts are written.
6. Add JSDoc, user documentation, targeted generator/analytics benchmarks, codegen if required, and the changeset.

## Non-Goals

- User-supplied node or edge IDs, index hydration, or allocator resets.
- Public switches for loops, parallel edges, deleted indexes, mixed edge kinds, or arbitrary malformed graphs.
- Cryptographic graph generation or a new public PRNG abstraction.
- Uniform sampling from all connected graphs or all DAGs.
- Layout coordinates beyond grid row/column payloads.
- Immediate public APIs for every named network model.
