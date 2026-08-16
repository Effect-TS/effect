# 08. Analytics and Specialist Algorithms

## Purpose

Add a small, defensible analytics surface after the graph correctness, verification, dense-kernel, traversal, path,
connectivity, and optimization plans have stabilized. This is not a request to port every algorithm in `.repos/graph`.
The Effect package should adopt algorithms with common demand, precise multigraph semantics, and reasonable bundle cost;
specialist or heuristic algorithms remain gated or out of scope.

Graph generators are owned by plan 09 and are not part of this plan. Tests and benchmarks use plan 02's shared fixtures
regardless of whether plan 09 has landed; this plan must not export generators or create private fixture helpers.

## Dependencies and Ownership

This plan requires:

- Plan 01's degree, self-loop, parallel-edge, and deterministic-order contracts.
- Plan 02's seeded fixtures, oracle adapters, property tests, and benchmark harness.
- Plan 03's ordered arc iterator, dense snapshot, numeric validation helpers, and synchronous checkpoint abstraction.
- Plan 05's unweighted and non-negative weighted shortest-path kernels for closeness and betweenness.
- Plan 06's connected-component support for validation and test oracles.
- Plan 07's minimum-spanning-tree and metric-closure decisions only if Steiner tree or approximate TSP are reconsidered
  outside this plan.

Plan 03 owns sparse `NodeIndex` to dense-position translation and arc storage. This plan may add analytics-specific
scratch arrays, but must not add another graph snapshot or CSR representation. Plan 09 owns public graph generators.
The later Effect-native interruption phase owns the execution wrapper; this plan identifies checkpoint boundaries and
must keep synchronous kernels independent of `Effect`.

## Assessment of `.repos/graph`

The reference implementation is useful as an algorithm inventory and fixture source, not as code to copy unchanged:

- Centrality already uses dense typed arrays and checks cancellation by source or power iteration. Degree, closeness,
  unweighted Brandes betweenness, and PageRank are compact and align well with Effect Graph.
- PageRank and HITS silently return the last iterate on non-convergence, while eigenvector and Katz throw plain
  `Error`. Effect Graph needs one explicit convergence contract and `GraphError` for synchronous failures.
- Weighted eigenvector and Katz accept unchecked negative, infinite, and `NaN` weights. Their convergence and sign
  semantics are therefore not suitable as-is.
- Core decomposition is a good linear-time bucket-peeling implementation. It treats direction as undirected, ignores
  self-loops, and counts parallel edges. Effect Graph should instead expose the operation only for undirected graphs
  so direction is never erased implicitly.
- Coloring correctly documents that greedy results are not chromatic optima, but its producer ignores self-loops while
  its validator rejects every coloring of a self-loop. A future API must reject a self-loop before producing a result.
- Isomorphism is a basic factorial backtracker. Its repeated full-edge scans and greedy payload-edge matching are not
  sufficient for a general public implementation, especially when an edge predicate is not transitive.
- Label propagation can oscillate until its iteration cap and returns the last partition without reporting that fact.
  Girvan-Newman repeatedly recomputes edge betweenness. The greedy modularity implementation evaluates every possible
  merge by recomputing modularity. These are useful demonstrations but poor production defaults.
- Louvain is the only community candidate with an acceptable direction, but the reference's deterministic local move
  policy and aggregation logic require differential validation on weighted loops and parallel edges before adoption.
- The LR planarity test has a suitable boolean-only scope and avoids recursion, but it is a large specialist kernel
  ported from NetworkX. License provenance, differential tests, and bundle impact are release blockers.
- Approximate TSP uses an all-pairs metric closure, silently falls back when `from` is missing, and symmetrizes directed
  distances. Its nearest-neighbor plus bounded 2-opt method has no useful approximation guarantee.
- Steiner tree is a metric-closure approximation built from shortest paths and two MSTs. It returns a reconstructed
  graph with new identities and throws plain errors. It belongs with optimization, not analytics.

## Portfolio Decision

| Item | Decision | Reason |
| --- | --- | --- |
| Degree, in-degree, and out-degree centrality | **Adopt** | Cheap, exact, common, and directly grounded in the shared degree contract. |
| Closeness centrality | **Adopt** | Common and exact; reuses shortest-path kernels. Disconnected semantics can be made explicit. |
| Betweenness centrality | **Adopt** | Common and exact; Brandes has a clear dense implementation and oracle ecosystem. |
| PageRank | **Adopt** | Widely used directed analysis with bounded state and well-defined convergence validation. |
| Core decomposition / k-core membership | **Adopt** | Exact linear-time undirected analysis with small implementation and output. |
| HITS | **Later** | Useful for link analysis but overlaps PageRank and adds another convergence/normalization contract. |
| Eigenvector centrality | **Later** | Useful but sensitive to disconnected graphs, dominant-eigenvalue multiplicity, signs, and convergence. |
| Katz centrality | **Later** | Requires a defensible attenuation bound or explicit non-convergence behavior; less common than PageRank. |
| Greedy coloring | **Later** | Valid scheduling heuristic, but not analytics and easy to mistake for minimum coloring. |
| Graph isomorphism | **Later** | Valuable structural query, but a correct multigraph matcher needs a stronger algorithm and cancellation. |
| Community detection | **Later, Louvain only** | Demand exists, but quality is heuristic and order/seed semantics are part of the result. |
| Label propagation | **Reject** | Unstable quality and termination; adds random-policy surface without a quality guarantee. |
| Girvan-Newman | **Reject** | Repeated betweenness is too expensive for a core default; dendrogram output substantially expands scope. |
| Naive greedy modularity | **Reject** | The reference implementation's repeated full modularity scoring is not scalable. |
| Boolean planarity | **Later** | Exact and useful, but specialist and implementation-heavy. Embeddings and counterexamples are excluded. |
| Approximate TSP | **Reject** | No meaningful guarantee in the proposed method, quadratic storage, and optimization rather than analytics. |
| Steiner tree | **Reject** | Specialist approximation with substantial path/MST composition and graph-identity questions; plan 07 territory. |

"Later" means no public API should be reserved until its acceptance gate below is met. "Reject" means do not add the
item to `Graph.ts` under this initiative; reconsideration requires a separate proposal with demonstrated Effect user
demand and package-size evidence.

## Shared Public and Numeric Contracts

All adopted functions are synchronous, accept immutable or mutable graphs, support data-first and data-last use with
`dual`, and return results keyed by stable public `NodeIndex` values. Score collections use
`ReadonlyMap<NodeIndex, number>` rather than records because indexes can be sparse and removed indexes are not dense
array positions. Maps are populated in node insertion/index iteration order.

The implementation snapshots graph structure at call entry. It must not expose dense positions, and callbacks must not
be allowed to make an in-progress mutable graph produce a partly old and partly new result. Follow the plan 03 policy
for mutation during callbacks.

Common validation:

- Every tolerance must be finite and greater than zero.
- Every iteration/pass limit must be a positive safe integer.
- A weighted algorithm evaluates the edge callback once per edge at snapshot construction and caches the result.
- Algorithms based on distances require weights greater than or equal to zero; weighted betweenness requires strictly
  positive finite weights because zero-weight shortest-path cycles invalidate the simple Brandes dependency count.
- `Infinity` may mean an impassable edge only where plan 03's shared weight policy supports it. `NaN`, negative values,
  and unexpected infinities throw `GraphError` before partial output is returned.
- Spectral and modularity methods, if accepted later, require finite non-negative weights. Parallel-edge weights sum.
- Invalid options, missing node indexes, unsupported graph kinds, invalid weights, and non-convergence throw
  `GraphError`. Empty valid graphs return empty maps or empty collections.

Synchronous cancellation is deliberately not exposed as `AbortSignal`. Kernels call plan 03's no-op checkpoint at the
boundaries listed below. The additive Effect APIs introduced in the interruption phase run chunked versions of the
same kernels and check fiber interruption at those checkpoints; they fail with `GraphError` for algorithm errors and
remain interruptible through the Effect runtime. Do not add duplicate `AbortSignal` and Effect cancellation models.

No adopted algorithm is random. Results must be byte-for-byte stable for the same graph, options, and JavaScript
runtime. A later randomized algorithm must accept an explicit integer `seed`, use the repository-owned PRNG from plan
02, and document the PRNG/version as observable behavior. It must never use `Math.random`, current time, or an implicit
random seed. Community detection should default to deterministic node-index order; a seeded shuffled mode is a future
additive option, not required for first release.

## Adopted APIs

Names below follow the existing Effect Graph style rather than the `get*` naming in `.repos/graph`. Final JSDoc must
state normalization, graph-kind restrictions, multigraph behavior, complexity, and convergence.

```ts
export const degreeCentrality: <N, E>(
  graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">
) => ReadonlyMap<NodeIndex, number>

export const inDegreeCentrality: <N, E>(
  graph: Graph<N, E, "directed"> | MutableGraph<N, E, "directed">
) => ReadonlyMap<NodeIndex, number>

export const outDegreeCentrality: <N, E>(
  graph: Graph<N, E, "directed"> | MutableGraph<N, E, "directed">
) => ReadonlyMap<NodeIndex, number>
```

Scores are degree divided by `n - 1`, or zero when `n <= 1`. Parallel edges contribute independently, so scores may
exceed one. An undirected self-loop contributes two before normalization; a directed self-loop contributes once to
each of in-degree and out-degree. Do not add a graph-kind-erasing "total degree centrality" for directed graphs.

```ts
export interface ClosenessCentralityOptions<E> {
  readonly cost?: (edgeData: E) => number
}

export const closenessCentrality: {
  <E>(options?: ClosenessCentralityOptions<E>): <N, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => ReadonlyMap<NodeIndex, number>
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    options?: ClosenessCentralityOptions<E>
  ): ReadonlyMap<NodeIndex, number>
}
```

Without `cost`, distance is hop count. With `cost`, use non-negative weighted shortest paths. Directed graphs measure
outward closeness: distances from each node following outgoing arcs. For a source with `r` other reachable nodes and
distance sum `d`, return `(r / d) * (r / (n - 1))`, with zero when `r` or `d` is zero. This is the Wasserman-Faust
disconnected-graph correction and is not configurable in the first API. Parallel edges provide independent candidate
arcs; shortest distance naturally chooses the minimum. Self-loops do not improve a valid non-negative distance.
Checkpoint once per source and during long single-source queue scans at the shared work budget.

```ts
export interface BetweennessCentralityOptions<E> {
  readonly cost?: (edgeData: E) => number
}

export const betweennessCentrality: {
  <E>(options?: BetweennessCentralityOptions<E>): <N, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => ReadonlyMap<NodeIndex, number>
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    options?: BetweennessCentralityOptions<E>
  ): ReadonlyMap<NodeIndex, number>
}
```

Use Brandes: BFS without `cost`, Dijkstra with strictly positive `cost`. Scores exclude path endpoints and are always
normalized to `[0, 1]` for simple graphs: divide directed totals by `(n - 1)(n - 2)` and undirected totals by
`(n - 1)(n - 2) / 2`, returning zeros for `n <= 2`. Parallel edges are distinct shortest paths and therefore affect
path multiplicity even when endpoints and weights match. Directed paths follow outgoing arcs. Ignore self-loops in
predecessor/dependency accumulation. Checkpoint once per source and at the shared queue/heap work budget.

```ts
export interface PageRankOptions<E> {
  readonly weight?: (edgeData: E) => number
  readonly damping?: number
  readonly tolerance?: number
  readonly maxIterations?: number
}

export const pageRank: {
  <E>(options?: PageRankOptions<E>): <N, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => ReadonlyMap<NodeIndex, number>
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    options?: PageRankOptions<E>
  ): ReadonlyMap<NodeIndex, number>
}
```

Defaults are damping `0.85`, tolerance `1e-6`, and `100` iterations. Damping must be finite in `[0, 1)`. Unweighted
edges have weight one. Weighted PageRank requires finite non-negative weights; parallel weights sum and undirected
edges contribute one arc in each direction. A node whose outgoing weight sum is zero is dangling, including a node
with only zero-weight outgoing edges. Redistribute dangling mass uniformly and use a uniform teleport vector. A
self-loop participates in its node's outgoing distribution. Start uniformly, compare successive vectors by L1 norm,
and converge when the norm is at most `tolerance`. Normalize the final finite vector to sum to one. Throw `GraphError`
if no convergence occurs; never silently return the last iterate. Checkpoint at least once per iteration and at the
shared arc work budget.

Personalized teleport vectors and initial vectors are intentionally deferred. They complicate sparse-index
validation and can be added without changing this API when demand exists.

```ts
export const coreNumbers: <N, E>(
  graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">
) => ReadonlyMap<NodeIndex, number>

export const kCore: {
  (k: number): <N, E>(
    graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">
  ) => ReadonlyArray<NodeIndex>
  <N, E>(
    graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">,
    k: number
  ): ReadonlyArray<NodeIndex>
}
```

Use Batagelj-Zaversnik bucket peeling. `k` must be a non-negative safe integer. Return node indexes in graph insertion
order, not peel order. Parallel edges contribute independently. Self-loops are ignored for core decomposition: they
cannot connect a node to the remaining subgraph and must not allow a node to sustain its own core membership. This is
an explicit algorithm-specific exception to graph-theoretic degree. Weighted and directed cores are excluded; do not
silently erase direction. Checkpoint during snapshot construction and after each bounded peel-work budget.

## Later Candidates and Acceptance Gates

### Spectral and Link Scores

Only consider these after PageRank is shipped and real demand shows that PageRank is insufficient:

```ts
export interface IterativeScoreOptions<E> {
  readonly weight?: (edgeData: E) => number
  readonly tolerance?: number
  readonly maxIterations?: number
}

export interface HitsResult {
  readonly hubs: ReadonlyMap<NodeIndex, number>
  readonly authorities: ReadonlyMap<NodeIndex, number>
}

export const hits: {
  <E>(options?: IterativeScoreOptions<E>): <N, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => HitsResult
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    options?: IterativeScoreOptions<E>
  ): HitsResult
}

export const eigenvectorCentrality: {
  <E>(options?: IterativeScoreOptions<E>): <N, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => ReadonlyMap<NodeIndex, number>
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    options?: IterativeScoreOptions<E>
  ): ReadonlyMap<NodeIndex, number>
}

export interface KatzCentralityOptions<E> extends IterativeScoreOptions<E> {
  readonly attenuation: number
  readonly bias?: number
}

export const katzCentrality: {
  <E>(options: KatzCentralityOptions<E>): <N, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => ReadonlyMap<NodeIndex, number>
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    options: KatzCentralityOptions<E>
  ): ReadonlyMap<NodeIndex, number>
}
```

All three use finite non-negative edge weights, sum parallel arcs, include self-loops, and follow incoming arcs for
authority/eigenvector/Katz influence; undirected edges contribute both directions. HITS returns separate L2-normalized
hub and authority vectors. Eigenvector returns a non-negative L2-normalized dominant vector and must document behavior
for disconnected graphs and repeated dominant eigenvalues. Katz iterates `x = attenuation * A^T x + bias`, requires
finite positive bias, and must either validate a conservative spectral-radius bound before iteration or clearly fail
with `GraphError` on non-convergence. Every method throws on the iteration cap and checkpoints per iteration/work
budget. Empty graphs return empty maps.

Acceptance requires independently derived fixtures for directed hubs/authorities, disconnected equal-radius
components, bipartite oscillation, weighted parallel arcs, and non-convergence. Do not copy the reference's implicit
`A + I` shift without naming it as part of the mathematical API. Bundle comparison must show that shared power-
iteration machinery actually reduces added code; otherwise ship only the specifically requested score.

### Greedy Coloring

Potential API:

```ts
export interface ColoringOptions {
  readonly strategy?: "largest-first" | "dsatur"
}
export interface Coloring {
  readonly colors: ReadonlyMap<NodeIndex, number>
  readonly colorCount: number
}
export const greedyColoring: {
  (options?: ColoringOptions): <N, E>(
    graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">
  ) => Coloring
  <N, E>(
    graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">,
    options?: ColoringOptions
  ): Coloring
}
export const isValidColoring: {
  (colors: ReadonlyMap<NodeIndex, number>): <N, E>(
    graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">
  ) => boolean
  <N, E>(
    graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">,
    colors: ReadonlyMap<NodeIndex, number>
  ): boolean
}
```

The result is a proper heuristic coloring, not a minimum coloring. Collapse parallel edges to one adjacency and reject
any self-loop with `GraphError`; returning a coloring that the validator rejects is forbidden. Largest-first sorts by
descending unique-neighbor degree then node insertion order. DSATUR chooses highest saturation, then highest degree,
then insertion order. Color numbers start at zero and are assigned deterministically. There are no weights, seeds, or
directed semantics. Checkpoint once per selected node and within large neighbor scans.

Acceptance requires a demonstrated scheduling/register-allocation use case, property tests that every output validates,
complete graphs, even/odd cycles, bipartite graphs, loops, parallel edges, sparse indexes, and adversarial fixtures
where greedy is non-optimal. Never test or claim that DSATUR always uses no more colors than largest-first; that is not
a general guarantee. Keep exact chromatic number out of scope.

### Isomorphism

Potential APIs, with `findIsomorphism` gated on demonstrated need for the witness:

```ts
export interface IsomorphismOptions<N, E> {
  readonly nodeEqual?: (left: N, right: N) => boolean
  readonly edgeEqual?: (left: E, right: E) => boolean
}

export const isIsomorphic: {
  <N, E, T extends Kind>(
    right: Graph<N, E, T> | MutableGraph<N, E, T>,
    options?: IsomorphismOptions<N, E>
  ): (left: Graph<N, E, T> | MutableGraph<N, E, T>) => boolean
  <N, E, T extends Kind>(
    left: Graph<N, E, T> | MutableGraph<N, E, T>,
    right: Graph<N, E, T> | MutableGraph<N, E, T>,
    options?: IsomorphismOptions<N, E>
  ): boolean
}

export const findIsomorphism: {
  <N, E, T extends Kind>(
    right: Graph<N, E, T> | MutableGraph<N, E, T>,
    options?: IsomorphismOptions<N, E>
  ): (left: Graph<N, E, T> | MutableGraph<N, E, T>) => Option.Option<ReadonlyMap<NodeIndex, NodeIndex>>
  <N, E, T extends Kind>(
    left: Graph<N, E, T> | MutableGraph<N, E, T>,
    right: Graph<N, E, T> | MutableGraph<N, E, T>,
    options?: IsomorphismOptions<N, E>
  ): Option.Option<ReadonlyMap<NodeIndex, NodeIndex>>
}
```

Require both graphs to have the same kind at the type level. Matching ignores public node and edge indexes unless
predicates inspect payloads.

Directed orientation, undirected endpoint symmetry, self-loops, and parallel-edge multiplicity are structural.
Payload predicates must be matched as a true bipartite matching of parallel edge occurrences, not the reference's
greedy first match. Use a VF2-class feasibility search with deterministic candidate order by node insertion index,
degree signatures, loop count, and already-mapped frontier. No weights or seed are intrinsic. Checkpoint at every
bounded backtracking budget; an Effect-native variant is required before exposing this potentially exponential API.

Acceptance requires exhaustive comparison against a brute-force oracle for all small directed and undirected
multigraphs, relabeling properties, negative near-isomorphs, predicate cases, and timeout/interruption tests. Benchmark
high-symmetry cycles, cliques, regular graphs, and deliberately non-isomorphic pairs. Reject release if common
20-50-node fixtures are dominated by avoidable full-edge scans.

### Community Detection

If adopted later, expose only deterministic Louvain plus a separately useful modularity scorer:

```ts
export interface LouvainOptions<E> {
  readonly weight?: (edgeData: E) => number
  readonly resolution?: number
  readonly maxPasses?: number
}
export const louvainCommunities: {
  <E>(options?: LouvainOptions<E>): <N>(
    graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">
  ) => ReadonlyArray<ReadonlyArray<NodeIndex>>
  <N, E>(
    graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">,
    options?: LouvainOptions<E>
  ): ReadonlyArray<ReadonlyArray<NodeIndex>>
}
export interface ModularityOptions<E> {
  readonly weight?: (edgeData: E) => number
  readonly resolution?: number
}
export const modularity: {
  <E>(
    communities: ReadonlyArray<ReadonlyArray<NodeIndex>>,
    options?: ModularityOptions<E>
  ): <N>(graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">) => number
  <N, E>(
    graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">,
    communities: ReadonlyArray<ReadonlyArray<NodeIndex>>,
    options?: ModularityOptions<E>
  ): number
}
```

Weights must be finite and non-negative, parallel weights sum, and self-loop weights contribute consistently to
internal weight and twice to weighted degree. Resolution must be finite and positive. Communities contain nodes in
insertion order and are ordered by their first node index. Validate that a modularity input covers every graph node
exactly once and contains no missing index; invalid partitions throw `GraphError`. Louvain stops when no move improves
modularity beyond a documented numeric epsilon or at `maxPasses`; unlike a fixed-point score, reaching the pass cap is
a valid bounded heuristic result and should be reported in an internal result during development. Decide before
release whether public metadata such as pass count is needed.

Initial release is deterministic and has no seed: visit nodes and candidate communities in stable insertion order and
break equal gains by the lowest stable community representative. If randomized traversal is later proven materially
better, add an explicit `seed` option with plan 02's PRNG; identical seeds must produce identical canonical partitions.
Checkpoint per local-moving sweep, aggregation pass, and work budget. Provide an Effect-native interruptible variant
before publishing because local moving has data-dependent duration.

Acceptance requires a reviewed modularity formula, NetworkX or igraph differential fixtures, hand-computed weighted
loop/parallel-edge cases, partition properties, resolution tests, deterministic repeats, and quality comparisons on
planted partitions. Benchmarks must include sparse graphs at 1k, 10k, and 100k nodes and must rule out the reference
greedy-modularity and Girvan-Newman complexity. Do not promise recovery of a ground-truth partition or global maximum.

### Boolean Planarity

Potential API:

```ts
export const isPlanar: <N, E>(
  graph: Graph<N, E, "undirected"> | MutableGraph<N, E, "undirected">
) => boolean
```

Use an iterative linear-time LR test over the underlying simple undirected graph. Self-loops and duplicate parallel
edges do not affect the answer and are removed in stable edge order. No weights or seed apply. The first release must
not return an embedding, faces, Kuratowski witness, or layout. Checkpoint during component discovery and bounded DFS
orientation/testing work; publish an Effect-native variant together with the synchronous function if large-graph
interruption cannot otherwise be practical.

Acceptance requires confirmed BSD-compatible provenance for any port, K5, K3,3, subdivisions, Petersen, grids,
disconnected mixtures, loops/parallel edges, exhaustive small simple graphs, and differential tests against NetworkX.
Benchmark long paths and at least a 100k-edge sparse graph for stack safety and linear scaling. Run bundle comparison;
the boolean kernel is rejected from the core module if its minified cost is disproportionate to measured demand.

## Explicit Rejections

Approximate TSP must not be added under an analytics name. If plan 07 revisits it, require an undirected graph, an
existing start index (`GraphError` if missing), finite non-negative weights, deterministic tie-breaking by node/edge
index, explicit metric-closure memory documentation, and a method with a stated guarantee on metric inputs. A returned
tour over closure nodes must also distinguish closure cost from the expanded edge walk. Nearest-neighbor plus bounded
2-opt alone does not meet that gate.

Steiner tree must likewise remain outside this plan. Any future plan 07 proposal must define whether the result is an
edge-index set or a newly indexed graph, preserve parallel-edge identity during path expansion, require an undirected
graph and connected terminals, validate finite non-negative weights, state the approximation ratio and assumptions,
checkpoint each terminal-pair shortest path/MST phase, and benchmark the quadratic terminal metric closure. The
small reference tests are insufficient evidence for the package cost.

## Staged Delivery

### Stage A: Contracts and Kernel Readiness

- Freeze the score map, normalization, loop, parallel-edge, and graph-kind semantics above.
- Confirm plan 03 dense snapshots retain stable node order and edge identity in outgoing and incoming arcs.
- Add shared finite-option and weight validation without exporting analytics APIs.
- Add benchmark datasets through plan 02; coordinate any reusable public generators with plan 09 rather than adding
  them here.

Exit gate: sparse-index, loop, and parallel-edge kernel tests pass, and no duplicate CSR/snapshot exists.

### Stage B: Degree and Core Decomposition

- Add the three degree centralities, `coreNumbers`, and `kCore`.
- Implement bucket peeling with typed arrays and canonical map/array conversion at the boundary.
- Add JSDoc and type tests proving directed-only and undirected-only APIs reject the wrong graph kind.

Exit gate: hand fixtures and small brute-force peeling oracle agree; scaling is linear; `pnpm lint-fix`, targeted Graph
tests, targeted Graph type tests, and `pnpm check` pass.

### Stage C: Path-Based Centrality

- Add unweighted closeness and betweenness first.
- Add weighted modes only after shared shortest-path validation and heap behavior are stable.
- Reuse buffers per source and avoid predecessor object allocation where incoming arcs plus distance labels suffice.

Exit gate: NetworkX differential tests pass within the numeric tolerances below; weighted/unweighted benchmark
regressions are recorded and cancellation checkpoints are exercised by an instrumented internal checkpoint.

### Stage D: PageRank

- Add weighted/unweighted PageRank with explicit dangling handling and non-convergence errors.
- Keep personalization out of the first release.
- Add convergence metadata internally for tests even if the public result remains a map.

Exit gate: stochastic-mass invariants, analytic fixtures, NetworkX comparisons, iteration-cap errors, and sparse
100k-edge benchmarks pass.

### Stage E: Effect-Native Interruption

- Add `closenessCentralityEffect`, `betweennessCentralityEffect`, and `pageRankEffect` only after the synchronous
  kernels stabilize; add `coreNumbersEffect` only if benchmarks show peeling can monopolize a fiber materially.
- Return `Effect.Effect<Result, GraphError>` and preserve ordinary Effect interruption rather than translating it into
  `GraphError`.
- Verify cancellation latency against the shared work budget and verify identical successful output to sync APIs.

Exit gate: interruption tests do not rely on wall-clock sleeps and synchronous bundle paths do not import Effect
runtime machinery solely for checkpoints.

### Stage F: Re-evaluate Later Candidates Individually

Each later candidate gets a separate changeset and can be declined independently. Prioritize observed demand, oracle
quality, interruption, and bundle impact, not parity with `.repos/graph`. Do not combine spectral scores, coloring,
isomorphism, community detection, and planarity into one release.

## Verification Strategy

### Correctness and Oracles

- Use exact hand calculations for paths, cycles, stars, cliques, disconnected graphs, directed chains, dangling-node
  PageRank, layered cores, and weighted parallel edges.
- Use brute-force shortest-path enumeration for betweenness on small multigraphs so parallel shortest paths are tested
  as occurrences rather than collapsed neighbors.
- Use iterative node deletion as an independent small-graph core-number oracle.
- Differential-test centralities, PageRank, and any later Louvain/planarity implementation against pinned NetworkX
  versions through plan 02's development-only adapter. Normalize conventions before comparing rather than weakening
  assertions until numbers match.
- Add relabeling properties: remapping stable indexes must remap score keys/partitions while preserving numeric values
  within tolerance. Add edge-insertion permutation tests only where the algorithm promises insertion-order
  independence; deterministic heuristic output may intentionally depend on insertion order.
- Verify every returned key is a live `NodeIndex`, every live node appears exactly once, no result is `NaN` or infinite,
  PageRank sums to one, and normalized betweenness is bounded for simple graphs.

Use absolute and relative tolerance together for numeric comparisons, initially `1e-10 + 1e-8 * abs(expected)` for
oracle fixtures. Do not use exact equality for iterative scores. Also validate residuals: PageRank's returned vector
must satisfy its transition equation within the requested tolerance, and later eigenvector/Katz outputs must satisfy
their defining equations after normalization. Comparing only rank order is insufficient.

### Performance and Memory

Benchmark separately:

- Sparse path, star, grid, random sparse, and dense graphs.
- Directed and undirected snapshots, with sparse stable indexes after removals.
- Unweighted versus weighted closeness/betweenness.
- PageRank iterations per second and allocation per iteration.
- Core decomposition at increasing edge counts.

Record asymptotic expectations: degree and core `O(V + E)`; unweighted closeness and betweenness `O(VE)` on sparse
graphs; weighted variants `O(V(E + V log V))`; PageRank `O(iterations * (V + E))`. Benchmarks must detect accidental
per-source snapshot construction, per-iteration `Map` rebuilding, queue `shift()`, and dense `V x V` allocation.

### Package Size

`Graph.ts` is already a broad public module, so every accepted algorithm must remain tree-shakeable and avoid runtime
dependencies. Run `pnpm bundle-compare <base-ref>` for every stage and report non-zero changes. Share dense snapshots,
heaps, validation, normalization, and checkpoint helpers only when already justified by multiple algorithms; do not
create a generic linear-algebra framework. Large specialist kernels, especially planarity, isomorphism, community
detection, TSP, and Steiner, require an explicit size budget and may belong in a future opt-in package rather than
`effect/Graph`.

## Release and Changesets

Every stage that exports a function, option, or result type requires a patch changeset for `effect`, public JSDoc with
`@since`, runtime tests in `packages/effect/test/Graph.test.ts`, and type tests in
`packages/effect/typetest/Graph.tst.ts`. Internal groundwork and benchmark-only changes do not require a changeset.
Use one focused changeset per shipped stage; do not announce later/rejected APIs. Run the narrow validation required by
the repository instructions, including doctests when public examples are added. No implementation stage is complete
until its bundle comparison, oracle version, numeric tolerances, convergence behavior, and benchmark baseline are
recorded in the pull request.
