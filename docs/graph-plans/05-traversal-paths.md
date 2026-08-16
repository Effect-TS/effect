# Plan 05: Traversal and Paths

## Scope

Add edge-aware traversal and path facilities without changing the signatures or result shapes of `dfs`, `bfs`,
`dfsPostOrder`, `dijkstra`, `astar`, `bellmanFord`, `floydWarshall`, `Walker`, or `PathResult`.

This plan owns:

- an edge-identity-preserving path model and shared reconstruction;
- path projections, validation, slicing, containment, and concatenation;
- enumeration of all tied shortest paths;
- bounded lazy simple paths and shortest simple alternatives;
- simple-cycle enumeration;
- optional edge-aware BFS/DFS visits;
- an optional bidirectional Dijkstra kernel for single-pair non-negative searches.

This plan does **not** own Eulerian paths/circuits (plan 07), connected/strongly connected/biconnected components,
reachability, topological ordering, transitive reduction, or other connectivity/DAG algorithms (plan 06). Random walks,
coverage planning, and mixed/bidirectional edge kinds from `.repos/graph` are also out of scope.

## Findings and Assumptions

- `PathResult<E>` currently exposes `path`, `distance`, and edge **data** in `costs`; it cannot distinguish parallel
  edges with equal data. After `a371754b1e`, immutable CSR weighted algorithms retain compact edge positions internally,
  but CSR has no compact-to-public `EdgeIndex` projection and mutable implementations still retain edge data. Public edge
  identity therefore remains unimplemented.
- `Walker` is repeatable and lazy. Each traversal iterator captures CSR graph state when iteration begins, active
  iteration is isolated from later mutation, and a fresh iterator observes current state. Existing BFS/DFS yield unique
  nodes in stable adjacency order, but node-only output cannot identify the discovery edge.
- The graph stores stable, monotonic node and edge indexes and preserves adjacency insertion order. New algorithms must
  use those indexes as identity and ordering keys.
- `.repos/graph` demonstrates the useful shape `source + edge/node steps`, all-tie predecessor reconstruction,
  loopless reconstruction in the presence of zero-weight predecessor cycles, lazy simple paths, Yen's algorithm,
  edge-identity path utilities, cycle enumeration, and bidirectional Dijkstra. Its semantics must be adapted to this
  repository's two graph kinds, numeric stable indexes, `GraphError`, and dual API conventions rather than copied.
- A path is a walk with explicit edge identity. Unless an API says "simple", repeated nodes and edges are structurally
  valid. A simple path has no repeated node. A simple cycle repeats only its first node at the end.
- New lazy iterables read graph state when a fresh iterator is created, matching `Walker`. They should use the same
  snapshot-isolation contract: mutation does not alter an already-issued iterator, while later iterators observe it.
  No public snapshot option is needed.

## Public Models

Names are provisional until the API review in phase 1, but the shape and separation from `PathResult` are required.

```ts
export interface Path {
  readonly nodes: ReadonlyArray<NodeIndex>
  readonly edges: ReadonlyArray<EdgeIndex>
}

export interface WeightedPath<E> extends Path {
  readonly distance: number
  readonly costs: ReadonlyArray<E>
}

export interface TraversalVisit<N, E> {
  readonly node: NodeIndex
  readonly data: N
  readonly depth: number
  readonly root: NodeIndex
  readonly via: Option.Option<readonly [EdgeIndex, Edge<E>]>
}

export interface EnumerationOptions {
  /** Maximum number of results. Zero yields none. Omitted means no result-count limit. */
  readonly limit?: number
}
```

`Path` invariants are `nodes.length >= 1` and `edges.length === nodes.length - 1`. The edge at position `i` connects
`nodes[i]` to `nodes[i + 1]` under the graph kind. The model intentionally stores no graph, node data, or edge objects,
so identity survives equal edge data and callers cannot mistake copied data for an edge identifier.

Do not add `edgeIndices` to `PathResult`, even as an optional field: that would make old and new results observably
different and encourage two path representations in one interface. Existing algorithms instead reconstruct an internal
`Path`, then project it to the exact current `PathResult<E>` shape. `costs` remains the historical name and continues to
contain edge data, not numeric weights.

## Path Utilities

All graph-taking functions are dual. Invalid structure returns `false` from the predicate and `Option.none` from safe
construction/slicing; programmer-invalid numeric bounds or incompatible concatenation use `GraphError`.

```ts
export const pathNodes: (path: Path) => ReadonlyArray<NodeIndex>
export const pathEdges: (path: Path) => ReadonlyArray<EdgeIndex>

export const pathNodeData: {
  <N, E, T extends Kind>(graph: Graph<N, E, T> | MutableGraph<N, E, T>, path: Path): Option.Option<Array<N>>
  (path: Path): <N, E, T extends Kind>(graph: Graph<N, E, T> | MutableGraph<N, E, T>) => Option.Option<Array<N>>
}

export const pathEdgeData: {
  <N, E, T extends Kind>(graph: Graph<N, E, T> | MutableGraph<N, E, T>, path: Path): Option.Option<Array<E>>
  (path: Path): <N, E, T extends Kind>(graph: Graph<N, E, T> | MutableGraph<N, E, T>) => Option.Option<Array<E>>
}

export const pathDistance: {
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    path: Path,
    cost: (edgeData: E) => number
  ): Option.Option<number>
  <E>(path: Path, cost: (edgeData: E) => number):
    <N, T extends Kind>(graph: Graph<N, E, T> | MutableGraph<N, E, T>) => Option.Option<number>
}

export const isValidPath: {
  <N, E, T extends Kind>(graph: Graph<N, E, T> | MutableGraph<N, E, T>, path: Path): boolean
  (path: Path): <N, E, T extends Kind>(graph: Graph<N, E, T> | MutableGraph<N, E, T>) => boolean
}

export const pathFromEdges: {
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    source: NodeIndex,
    edges: Iterable<EdgeIndex>
  ): Option.Option<Path>
  (source: NodeIndex, edges: Iterable<EdgeIndex>):
    <N, E, T extends Kind>(graph: Graph<N, E, T> | MutableGraph<N, E, T>) => Option.Option<Path>
}

export const pathSlice: (path: Path, options: {
  readonly from: number
  readonly to?: number
}) => Option.Option<Path>

export const pathContains: (path: Path, candidate: Path, options?: {
  readonly containment?: "prefix" | "contiguous"
}) => boolean

export const concatPaths: (head: Path, tail: Path) => Path
export const pathToResult: {
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    path: Path,
    distance: number
  ): Option.Option<PathResult<E>>
  (path: Path, distance: number):
    <N, E, T extends Kind>(graph: Graph<N, E, T> | MutableGraph<N, E, T>) => Option.Option<PathResult<E>>
}
```

`pathSlice` indexes nodes and uses half-open node bounds `[from, to)`, like `Array.slice`; it returns the corresponding
contiguous edge range. Empty node slices are rejected because `Path` always has a source. `pathContains` compares both
node and edge indexes, so equal node sequences using different parallel edges are different subpaths. `concatPaths`
requires the last head node to equal the first tail node. Projections preserve order and return fresh arrays.

## Ordered Arc and Reconstruction Kernel

Plan 03 should own an internal ordered arc iterator with records equivalent to:

```ts
interface Arc<E> {
  readonly from: NodeIndex
  readonly to: NodeIndex
  readonly edgeIndex: EdgeIndex
  readonly edge: Edge<E>
}
```

- `"outgoing"` on directed graphs emits source-to-target arcs; `"incoming"` emits reversed arcs;
  `"undirected"` emits both directions while emitting a self-loop once.
- All directions on an undirected graph use incident edges in edge-index/insertion order and orient each arc from the
  current node to the other endpoint. A self-loop is emitted once.
- Parallel edges produce parallel arcs and are never collapsed by neighbor identity.
- The iterator is the only adjacency primitive used by the new traversal/path/cycle kernels.

The shared predecessor record is `{ node: NodeIndex, edge: EdgeIndex }`. Single-path reconstruction chooses one record;
tie reconstruction stores all equal-distance records and lazily backtracks them. Backtracking tracks nodes on the
current partial path, preventing infinite reconstruction through zero-weight predecessor cycles and yielding only
loopless shortest paths. Existing `dijkstra`, `astar`, and `bellmanFord` migrate to this kernel only after regression
tests prove their current selected path, ordering, errors, and `PathResult` projection are unchanged.

## Edge-Aware Traversal

Node-only APIs remain unchanged. Add edge-aware variants only if plan 03's arc iterator makes them small wrappers:

```ts
export const dfsVisits: {
  (config?: SearchConfig): <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => Iterable<TraversalVisit<N, E>>
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    config?: SearchConfig
  ): Iterable<TraversalVisit<N, E>>
}

export const bfsVisits: typeof dfsVisits
export const collectDfsVisits: /* same arguments */ Array<TraversalVisit<N, E>>
export const collectBfsVisits: /* same arguments */ Array<TraversalVisit<N, E>>
```

Each node is yielded once. Roots have `depth: 0`, `root` equal to themselves, and `via: Option.none`; every other visit
contains the exact first-discovery edge and oriented reached node. Multiple starts are considered in supplied order,
duplicates are ignored after their first occurrence, and adjacency ties follow edge-index order. `radius` keeps its
current shortest-edge-distance meaning. These are discovery-tree visits, not an enumeration of every examined edge;
that distinction must be explicit in naming and JSDoc. The eager functions are exactly `Array.from(dfsVisits(...))`
and `Array.from(bfsVisits(...))`.

If the API review finds insufficient demand, omit these four public functions while still using edge-aware arcs
internally. Do not add an ambiguous `dfsEdges` that could mean discovery edges or all examined edges.

## All Tied Shortest Paths

```ts
export interface ShortestPathsConfig<E> extends EnumerationOptions {
  readonly source: NodeIndex
  readonly target: NodeIndex
  readonly cost: (edgeData: E) => number
  readonly algorithm?: "dijkstra" | "bellmanFord"
}

export const shortestPaths: {
  <E>(config: ShortestPathsConfig<E>): <N, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => Iterable<WeightedPath<E>>
  <N, E, T extends Kind>(
    graph: Graph<N, E, T> | MutableGraph<N, E, T>,
    config: ShortestPathsConfig<E>
  ): Iterable<WeightedPath<E>>
}

export const collectShortestPaths: /* same arguments */ Array<WeightedPath<E>>
```

`shortestPaths` means all **simple** source-to-target paths with minimum total weight, including alternatives differing
only by parallel-edge identity. `source === target` yields the empty path first and does not enumerate non-empty
zero-weight cycles. Unreachable targets yield nothing. Dijkstra requires all graph edge weights to be non-negative;
Bellman-Ford permits finite negative weights. Both reject `NaN` and `-Infinity`; `Infinity` is impassable. A reachable
negative cycle that can reach the target makes a minimum undefined and throws `GraphError`. Existing Bellman-Ford's
current `Option.none` behavior remains unchanged unless plan 01 independently classifies it as a bug.

For Dijkstra, do not stop when the target is first popped. Settle all nodes with distance less than or equal to the
target distance so equal paths ending in zero-weight edges are retained. Tie predecessors are appended in ordered arc
discovery order. Enumerate the resulting shortest-path relation forward in edge-index order, with an on-path node set,
so edge-index sequences are emitted lexicographically without collecting every result first. This ordering is stable
across heap implementations. `limit` truncates that order and does not claim that omitted tied paths do not exist.

Complexity before output is `O((V + E) log V)` for Dijkstra and `O(VE)` for Bellman-Ford, with `O(V + E_t)` predecessor
space where `E_t` is the number of shortest-path predecessor arcs. Reconstruction is `O(sum of emitted path lengths)`
plus ordering overhead. The number of tied paths can be exponential.

## Bounded Simple Paths

```ts
export interface SimplePathsConfig<E> extends EnumerationOptions {
  readonly source: NodeIndex
  readonly target: NodeIndex
  /** Maximum edge count; defaults to V - 1. */
  readonly maxDepth?: number
  /** Optional inclusive total-cost bound. Requires cost. */
  readonly maxDistance?: number
  readonly cost?: (edgeData: E) => number
}

export const simplePaths: /* dual */ Iterable<Path>
export const collectSimplePaths: /* dual */ Array<Path>
```

Use iterative DFS/backtracking, not recursive calls, so long chains are stack-safe. The current-path node set enforces
looplessness. The natural finite bound is `V - 1`; `maxDepth` may only reduce it. `limit`, `maxDepth`, and `maxDistance`
are checked before expanding more arcs. `limit: 0` performs endpoint and option validation, then yields nothing.
`maxDepth` must be a non-negative integer. `maxDistance` must not be `NaN`; negative values simply yield no paths unless
`source === target` and zero is allowed.

Cost pruning is sound only for non-negative weights, so providing `maxDistance` validates all weights as non-negative,
not `NaN`, and not `-Infinity`; `Infinity` remains impassable. Without `maxDistance`, weights are irrelevant and negative edges are accepted. Self-loops
cannot occur in a simple source-to-target path, while parallel edges create distinct paths. Directed edges follow their
direction; undirected edges may be traversed either way but the same node cannot be revisited.

Output is depth-first lexicographic edge-index order. A yielded path is materialized, but unexplored paths are not;
abandoning the iterator must stop work immediately. Worst-case time/output is exponential, per-active-iterator working
space is `O(V + E)` plus one materialized result, and eager collection adds output-sized memory.

## Shortest Simple Alternatives

```ts
export interface ShortestSimplePathsConfig<E> extends EnumerationOptions {
  readonly source: NodeIndex
  readonly target: NodeIndex
  readonly cost: (edgeData: E) => number
}

export const shortestSimplePaths: /* dual */ Iterable<WeightedPath<E>>
export const collectShortestSimplePaths: /* dual */ Array<WeightedPath<E>>
```

Implement Yen's algorithm first. It fits the existing non-negative single-pair Dijkstra kernel, preserves edge identity,
handles directed/undirected graphs and parallel edges, and is substantially simpler to verify than Eppstein's algorithm.
Do not copy `.repos/graph`'s filtered graph objects; pass temporary banned-node and banned-edge-index sets into the
internal shortest-path kernel so stable indexes, graph identity, and adjacency order remain intact.

Weights must be non-negative and not `NaN`; `Infinity` is impassable. Negative-weight alternatives are deferred: Yen
with a Bellman-Ford spur kernel is possible but complicates cycle and potential handling without a demonstrated need.
The empty source-to-source path is the only result for equal endpoints. Candidates are deduplicated by complete
edge-index sequence. Output is nondecreasing total distance, then lexicographic edge-index sequence. `limit` is the
maximum `k`; omitted `limit` enumerates until the candidate heap is empty, which may enumerate every simple path.

For `k` emitted paths, a conventional implementation is `O(k V (E + V) log V)` worst case with Dijkstra spur searches,
plus candidate storage. Benchmark before considering Eppstein or replacement-path optimizations.

## Cycle Enumeration

```ts
export interface CyclesConfig extends EnumerationOptions {
  readonly maxLength?: number
}

export const cycles: /* dual */ Iterable<Path>
export const collectCycles: /* dual */ Array<Path>
```

Enumerate elementary cycles. A returned cycle repeats its source node at the end, so a self-loop is `{ nodes: [v, v],
edges: [e] }`. Directed rotations are one cycle; reverse orientation is distinct only when distinct directed edges make
it traversable. For undirected graphs, rotations and reversal are the same cycle. Two parallel undirected edges form a
valid length-two cycle; one undirected edge traversed out and immediately back is not a cycle because an edge cannot be
used twice. Distinct edge-index sets/sequences can therefore identify cycles with the same node set.

Use Johnson's blocked-set algorithm for directed graphs, restricted to SCCs supplied by plan 06 if available; otherwise
use an internal SCC helper that is not exported. Adapt the search for undirected graphs with arrival-edge tracking and
canonicalization. Canonical output rotates to the smallest node index; undirected output chooses the lexicographically
smaller edge-index sequence across the two orientations. Output visits canonical start nodes in node-index order and
explores their arcs depth-first in edge-index order; duplicate canonical identities are suppressed on discovery. This is
deterministic but intentionally does not promise a global sort that would require eager collection. `maxLength` is an
inclusive edge count and must be a positive integer; `limit: 0` yields none.

Johnson's directed complexity is `O((V + E)(C + 1))` for `C` cycles, excluding output copies. Undirected adaptation
should target the same output-sensitive class; document any weaker bound if implementation evidence requires a simpler
algorithm. The lazy implementation must not first collect all cycles for one start node, a defect visible in the
reference implementation. The eager API only collects the lazy API.

## Optional Bidirectional Dijkstra

After the shared kernel and differential tests are stable, prototype bidirectional Dijkstra for one non-negative
source/target query. It may be:

- an internal optimization under existing `dijkstra`, only if exact current path/tie selection remains unchanged; or
- an additive `dijkstraBidirectional` returning `Option.Option<PathResult<E>>` (and optionally an edge-aware sibling)
  if deterministic equivalence cannot be guaranteed.

Forward search uses outgoing arcs and backward search uses incoming arcs. For undirected graphs both use incident arcs.
Terminate only when the minimum forward key plus minimum backward key is at least the best complete-path distance.
Validate every weight before an early return, including `source === target`, so a negative edge outside the explored
frontier cannot evade Dijkstra's contract. Meeting-node and equal-cost ties use the complete edge-index sequence rule,
not whichever frontier happened to run first.

Expected complexity remains `O((V + E) log V)` time and `O(V + E)` space, with lower explored volume on suitable
single-pair workloads. Do not ship the optimization unless benchmarks show a material win on sparse road/grid and
random/small-world fixtures without a meaningful regression on chains, stars, dense graphs, or tiny graphs.

## Cancellation and Effect-Native Follow-up

Synchronous APIs remain synchronous. There is no public checkpoint, cancellation callback, `AbortSignal`, or progress
option. Kernels use plan 03's internal no-op checkpoint protocol at boundaries such as:

- once per settled/dequeued node in shortest-path and traversal kernels;
- once per Bellman-Ford edge-relaxation pass and at bounded intervals within a pass;
- once per DFS backtracking/expansion step for simple paths and cycles;
- before each Yen spur search and candidate emission.

Checkpoint cadence is an internal performance and interruption detail, not a public callback or result-ordering
contract. Plan 10 alone owns Effect adapters that provide fiber interruption and cooperative yielding.

After synchronous kernels stabilize, additive Effect variants may wrap the same kernels with the plan 03 checkpoint
abstraction and return `Effect`/`Stream` forms with native interruption. Do not add Effect variants in the initial phases,
and do not claim interruption for a synchronous `Iterable` that only checks between `next()` calls.

## Cross-Cutting Semantics

| Concern | Contract |
| --- | --- |
| Directed graph | Follow source-to-target arcs unless a traversal config explicitly says `incoming` or `undirected`. Path-finding configs do not ignore direction. |
| Undirected graph | Every edge is traversable both ways; output retains the one stored `EdgeIndex`. Storage orientation does not affect validity. |
| Self-loop | Valid path step and a length-one cycle; excluded from simple paths except cycle output; source-to-source shortest/simple-alternative output is the empty path only. |
| Parallel edges | Independent arcs, predecessor choices, paths, and cycles. Equal data never deduplicates edge identities. |
| Zero-weight cycle | Dijkstra accepts it. Tie reconstruction tracks on-path nodes and emits finite loopless shortest paths only. |
| Negative weight | Rejected by Dijkstra, A*, Yen, and bounded cost pruning. Bellman-Ford tie APIs accept finite negatives and reject target-affecting negative cycles. |
| `NaN` / infinities | `NaN` and `-Infinity` are invalid. `Infinity` means impassable. Heuristic validation remains the existing A* contract. |
| Missing endpoint | Public path-finding/enumeration APIs throw the existing missing-node `GraphError`; utility predicates return `false` and safe constructors/projections return `Option.none`. |
| Determinism | Default structural order is stable node/edge insertion index. Cost-ranked outputs use distance, then lexicographic edge-index sequence. |
| Bounds | Counts and lengths are integers in their documented ranges or throw `GraphError`; all checks happen before expensive work. |
| Laziness | Creating an iterable does no search. Each iterator has fresh state. Eager functions are literal collection of the lazy form and have identical ordering/errors. |

## Implementation Phases

1. **Contracts and fixtures**: resolve names with plans 01-04; retain the landed traversal snapshot/order fixtures, add
   the remaining radius/start-ownership/DFS-root regressions, and define canonical path/cycle identity and weight
   validation.
2. **Internal foundation**: extend the landed CSR rather than replacing it: add stable public edge-ID projection, unify
   mutable and immutable predecessor state, and consume plan 03's heap, checkpoint, and weight policy. Keep all new pieces
   internal initially.
3. **Path model and utilities**: publish `Path`, projections, validation, construction, slicing, containment,
   concatenation, and type tests. Migrate existing reconstruction internally while preserving `PathResult` output.
4. **All tied shortest paths**: add lazy/eager APIs with Dijkstra and Bellman-Ford, zero-weight-cycle guards, bounds,
   deterministic ordering, and differential tests.
5. **Bounded simple paths**: add stack-safe lazy DFS and exact eager collector; verify early abandonment does not explore
   later branches.
6. **Shortest alternatives**: add Yen over banned-view Dijkstra, candidate heap, identity deduplication, and exhaustive
   small-graph oracle tests.
7. **Cycle enumeration**: add directed and undirected elementary-cycle iterators, canonicalization, bounds, and eager
   collection. Coordinate SCC reuse with plan 06 without exposing connectivity APIs here.
8. **Optional traversal visits**: add edge-aware visits only if API review validates the use case and implementation is a
   thin shared-kernel wrapper.
9. **Bidirectional prototype**: benchmark and either adopt internally with exact compatibility, expose additively, or
   discard with recorded results.
10. **Effect-native follow-up**: after synchronous performance and semantics settle, separately propose interruptible
    Effect/Stream wrappers.

Each phase should be independently reviewable. Do not combine cycle enumeration, Yen, and bidirectional optimization in
one change.

## Tests and Oracles

Add focused runtime tests under `packages/effect/test/Graph.test.ts` or a dedicated `GraphPaths.test.ts`, plus public
type assertions in `packages/effect/typetest/Graph.tst.ts`.

Required example tests:

- valid/invalid directed and reverse-stored undirected paths; stale node/edge indexes; malformed lengths;
- projection and slicing laws, concatenation identity, prefix versus contiguous containment, and no input-array aliasing;
- parallel edges with identical data remain distinct through shortest paths, simple paths, Yen, and cycles;
- self-loops, directed mutual pairs, undirected triangles, and two parallel undirected edges;
- all diamond ties, weighted ties, ties ending in zero-weight edges, and zero-weight predecessor cycles;
- unreachable/equal endpoints; sparse indexes after removals; multiple starts and radius behavior for traversal visits;
- negative edges outside an early-exit frontier, negative cycles reachable/unreachable from source and able/unable to
  reach target, `NaN`, `Infinity`, and `-Infinity`;
- `limit` values `0`, `1`, and larger than output; `maxDepth` at `0`, exact path length, and below path length;
- internal checkpoint-count and resumability tests for every long-running family, using plan 02's probe harness;
- repeated iteration produces equal output and eager output equals `Array.from(lazyOutput)`;
- iterator abandonment after the first result does not enumerate/materialize remaining exponential branches;
- exact deterministic output after unrelated removals create sparse, non-contiguous indexes.

Property and differential oracles:

- enumerate all edge-index sequences up to `V - 1` on seeded graphs with at most 7 nodes and compare simple paths,
  minimum tied paths, sorted `k` alternatives, and cycles after canonicalization;
- compare Dijkstra and Bellman-Ford distances on non-negative graphs and compare optional bidirectional Dijkstra to the
  unidirectional kernel on directed and undirected seeded multigraphs;
- use Floyd-Warshall distances as a small-graph distance oracle only, not as an edge-identity/tie oracle;
- validate every emitted result with `isValidPath`, recompute its distance from edge indexes, and assert simple/cycle
  node uniqueness rules;
- metamorphic checks: adding an unreachable component does not change pair results; consistently increasing all edge
  indexes through fixture reconstruction changes only identity/order, not distances; reversing stored endpoints of every
  undirected edge preserves path/cycle identities modulo orientation;
- retain `.repos/graph` cases as inspiration, especially zero-weight cycles, all diamond ties, parallel-edge Yen, cycle
  deduplication, lazy first-result behavior, and negative edges beyond the explored frontier, but express expected values
  using Effect `Graph` indexes and `@effect/vitest` assertions.

## Benchmarks

Use plan 02's seeded fixture and benchmark harness. Record time, allocations where available, explored nodes/arcs, and
first-result versus full-consumption latency for:

- BFS/DFS node walkers using `a371754b1e` as the CSR baseline, including cold snapshot construction, warm reuse, sparse
  indexes, and active/fresh mutable iteration;
- single-pair Dijkstra on chain, grid/road-like, random sparse, small-world, star, dense, and disconnected graphs;
- all-tie shortest paths on layered diamonds, measuring first result, first 10, and full bounded consumption;
- simple paths on deep chains (stack safety) and diamond ladders (early abandonment);
- Yen for `k = 1, 5, 10, 50` on sparse weighted multigraphs;
- cycle enumeration for acyclic, one-cycle, sparse many-cycle, and dense bounded cases;
- eager versus lazy peak memory on 10k-node fixtures and tie-heavy small fixtures.

Acceptance gates: no material regression in existing BFS/DFS or unidirectional Dijkstra baselines; lazy first-result work
must not scale with the number of unconsumed results; bidirectional Dijkstra ships only with a demonstrated representative
win and no semantic drift. Benchmark thresholds should be based on plan 02 baselines rather than hard-coded wall times.

## Changesets and Documentation

- Internal kernel migrations with no public or runtime behavior change need no changeset.
- Each shipped group of new public models/functions requires an `effect` **minor** changeset because it is additive API.
- Any independently demonstrated correction to existing runtime behavior requires an `effect` **patch** changeset and a
  regression test; do not silently fold such corrections into this additive plan.
- Every public symbol needs dual data-first/data-last signatures where applicable, JSDoc with directed/undirected and
  laziness caveats, `@since`, examples, and typetests. Runnable examples require doctests.
- Generated barrels must be updated through `pnpm codegen`, never by hand.

## Dependencies and Ownership

- **Plan 01, correctness contracts**: required before API implementation. It owns final missing-node, numeric-weight,
  negative-cycle, mutable-iteration, self-loop, parallel-edge, and deterministic-order contracts. This plan must not
  redefine existing behavior unilaterally.
- **Plan 02, verification and benchmarks**: required for seeded multigraph generators, brute-force/oracle adapters,
  laziness instrumentation, and benchmark baselines.
- **Plan 03, architecture and performance kernel**: required for the ordered arc iterator, optional dense snapshot,
  heap, shared weight validation, edge-index predecessors/reconstruction, and no-op checkpoint abstraction. This plan
  should not create competing helpers.
- **Plan 04, core queries and transforms**: required for stable incident-edge queries and any internal filtered/banned
  graph view used by Yen. Yen must not clone or renumber public graphs.
- **Plan 06** may later supply SCC decomposition to accelerate Johnson cycle enumeration. Cycle correctness cannot depend
  on plan 06 landing first; keep any temporary SCC helper internal and remove it when shared ownership is available.
- **Plan 07** exclusively owns Eulerian algorithms. It may consume this plan's `Path` model and plan 03's arc iterator, but this
  plan must not implement or expose Eulerian paths, circuits, or edge-covering walks.

Work that can proceed before all dependencies land is limited to contract tests, API naming review, brute-force test
oracles, and benchmark fixture design. Public implementation begins only after plans 01 and 03 settle the shared
semantics and internal representations.
