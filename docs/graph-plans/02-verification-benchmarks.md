# Verification and Benchmark Foundations

## Objective

Build one reproducible verification and performance foundation for all Graph work. The foundation must detect semantic
regressions in directed and undirected multigraphs, distinguish algorithmic complexity regressions from machine noise,
and produce reproducible performance artifacts without putting wall-clock thresholds in the normal test suite.

This plan does not add Graph APIs or implement tests. It defines the fixtures, adapters, assertions, benchmark workloads,
CI policy, and ownership boundaries that later Graph plans should use.

## Assumptions and Constraints

- Preserve the shared contracts in [`README.md`](./README.md#shared-semantics): stable monotonic indexes, deterministic
  insertion order, unique neighbor-node queries, occurrence-preserving incident-edge queries, parallel edges, and
  self-loops.
- Verification infrastructure is development-only. Graphology and comparison libraries must be dev dependencies and
  must not enter Effect's runtime exports or production dependency graph.
- Pure Graph tests use regular `it` and `assert` from `@effect/vitest`; Effect-returning additions use `it.effect` and
  never `Effect.runSync`, as required by [`.patterns/testing.md`](../../.patterns/testing.md#testing-framework-selection).
- Property failures must print a replayable seed and, for fast-check tests, the replay path. Randomness without an
  explicit seed is prohibited.
- Correctness gates compare semantic results. They do not compare implementation-specific traversal orders from an
  oracle library when Effect promises its own insertion/index order.
- Timing benchmarks are evidence, not correctness tests. Deterministic operation counts are the primary complexity
  regression gate whenever the operation can be counted.

## Current Baseline

The existing suite already has broad example coverage in
[`packages/effect/test/Graph.test.ts`](../../packages/effect/test/Graph.test.ts): construction and stable allocation,
set operations, mutation, parallel edges and self-loops, connectivity, shortest paths, traversals, and topological
ordering. Pathfinding also has three larger terrain examples in
[`packages/effect/test/Pathfinding.test.ts`](../../packages/effect/test/Pathfinding.test.ts#L26-L58). The missing layer is
systematic seeded coverage, independent oracles, deterministic scaling checks, and a maintained benchmark corpus.

The implementation currently exposes connectivity, shortest-path, traversal, and DAG algorithms from
[`Graph.ts`](../../packages/effect/src/Graph.ts#L3445-L5808). Verification should be added beside the existing examples,
not replace readable hand-checked cases.

The package already has two performance mechanisms:

- Ad hoc Tinybench scripts under `packages/effect/benchmark/`; the Optic benchmark demonstrates batching, an observable
  sink, `hrtimeNow`, and normalized ns/op reporting
  ([`Optic.ts`](../../packages/effect/benchmark/schema/Optic.ts#L4-L20),
  [`Optic.ts`](../../packages/effect/benchmark/schema/Optic.ts#L75-L103)).
- The maintained `runtimeperf` harness, which runs validated synchronous fixtures in fresh Node processes, calibrates
  batches, rotates implementations, records raw results, and supports paired base/head comparisons
  ([`runtimeperf/README.md`](../../packages/effect/runtimeperf/README.md#measurement-model),
  [`run.mts`](../../packages/effect/runtimeperf/run.mts#L45-L98),
  [`compare.mts`](../../packages/effect/runtimeperf/compare.mts#L144-L180)).

Graph benchmarks should use `runtimeperf` as the authoritative harness. A small standalone Tinybench file is useful for
local profiling only and must consume the same fixture definitions.

## File Layout and Ownership

Implement the foundation with the following development-only layout:

| Path | Responsibility |
| --- | --- |
| `packages/effect/runtimeperf/suites/graph/fixtures/corpus.ts` | Neutral seeded graph specifications, PRNG, named corpus shapes, size tiers, and corpus fingerprints. No library imports. |
| `packages/effect/runtimeperf/suites/graph/fixtures/effect.ts` | Convert a neutral specification to an Effect Graph and retain ordinal-to-`NodeIndex` / ordinal-to-`EdgeIndex` maps. |
| `packages/effect/runtimeperf/suites/graph/fixtures/graphology.ts` | Graphology conversion for differential tests and benchmark scenarios. |
| `packages/effect/runtimeperf/suites/graph/fixtures/competitors.ts` | Cross-library adapters only; no correctness normalization. Add ngraph or graphlib only for workloads with a comparable public API. |
| `packages/effect/runtimeperf/suites/graph/fixtures/cases.ts` | `RuntimePerfCase` factories. Construction happens in the factory for steady-state cases and in `run` only for explicit cold/build cases. |
| `packages/effect/test/GraphProperty.test.ts` | Algebraic, metamorphic, model-based mutation, and rich multigraph properties. |
| `packages/effect/test/GraphDifferential.test.ts` | Hand-validated oracle adapters followed by seeded differential cases. |
| `packages/effect/test/GraphComplexity.test.ts` | Deterministic operation-count and lazy-materialization guards; no elapsed-time assertions. |
| `packages/effect/runtimeperf/config.json` | `graph` suite registry, scenario metadata, tiers, shapes, and implementations. |
| `packages/effect/runtimeperf/README.md` | Commands, workload semantics, corpus description, and interpretation policy. |

The corpus lives with the runtimeperf fixture directory because base/head materialization copies the complete fixture
directory ([`materialize.mts`](../../packages/effect/runtimeperf/materialize.mts#L5-L13)). Tests may import these
development-only modules directly. Do not place shared fixture code under `src/` or export it from `effect`.

## Shared Seeded Fixtures

### Neutral representation

Define a readonly `GraphSpec` with only primitives:

```ts
type GraphSpec = {
  readonly name: string
  readonly seed: number
  readonly kind: "directed" | "undirected"
  readonly nodeCount: number
  readonly edges: ReadonlyArray<readonly [source: number, target: number, weight: number, id: number]>
}
```

Node data is its ordinal. Edge data is `{ readonly id: number; readonly weight: number }`. Explicit edge IDs preserve
identity through normalization and distinguish equal-weight parallel edges. Keep generation separate from adaptation so
every implementation receives the exact same edge list, following the reference harness's neutral-input rule
([`.repos/graph/bench/compare/generate.ts`](../../.repos/graph/bench/compare/generate.ts#L1-L14)).

Use a small, local 32-bit PRNG such as `mulberry32`, with its algorithm pinned by golden output for one seed. The reference
generator is a suitable starting point ([`.repos/graph/tests/differential/generators.ts`](../../.repos/graph/tests/differential/generators.ts#L4-L13)),
but add these safeguards:

- Validate `nodeCount`, edge bounds, finite integer weights, and feasible simple-edge targets before generation.
- Use tuple keys or strings for deduplication; do not encode `source * nodeCount + target` once sizes could exceed exact
  integer arithmetic.
- Return the requested node count exactly. Grid and layered generators must not silently round up.
- Fingerprint the canonical neutral spec with SHA-256 and include the fingerprint in benchmark reports.
- Generation is outside timed operations except explicit graph-construction scenarios.

### Fixture families

Maintain two disjoint families:

1. `oracleSimple`: no self-loops or parallel edges, positive integer weights, directed and undirected variants. This is
   the lowest common denominator for independent libraries.
2. `effectRich`: self-loops, same-direction and reverse-direction parallel edges, disconnected nodes, sparse public
   indexes created by deterministic removals, duplicate weights, and zero/negative weights where an algorithm permits
   them. These fixtures verify Effect semantics through independent properties, not forced oracle equivalence.

Use a fixed smoke seed set such as `[3, 7, 13, 21, 34, 55, 89, 144]`. Do not create one Vitest test per seed; run the
seed matrix inside a named test so reporting remains readable, and include `kind`, shape, size, seed, and fingerprint in
failure messages. Add one fast-check arbitrary over bounded neutral specs for shrinking. Configure its `seed`,
`numRuns`, and `endOnFailure`; CI should print the fast-check replay path.

### Corpus shapes and sizes

| Shape | Construction | Semantic purpose |
| --- | --- | --- |
| `empty` / `singleton` | 0 or 1 node, optional loop | Boundary conditions and zero-sized allocations. |
| `chain` | `i -> i + 1` | Deep traversal, path reconstruction, stack safety, and linear scaling. |
| `starIn` / `starOut` | One hub with all incoming or outgoing arcs | Directionality, high degree, and adjacency hot paths. |
| `cycle` | Ring, plus optional loop and parallel pair | SCC, acyclicity, and cycle semantics. |
| `disconnected` | Several chains/cycles plus isolates | Components and unreachable paths. |
| `grid` | Exact-size right/down lattice; undirected variant | Long alternative paths and A* heuristics. |
| `layeredDag` | Fixed-width layers, local fanout, seeded skip edges | Topological order, workflow-like traversal, and many equal-cost paths. |
| `uniformSparse` | Seeded random, spanning chain first, approximately 3 edges/node | General reachable sparse workload. |
| `scaleFree` | Seeded preferential attachment | Hub-heavy degree distribution and asymmetric reachability. |
| `dense` | Complete or fixed-density simple graph | Quadratic/cubic algorithms at deliberately small sizes. |
| `parallelChain` | `k` edges per adjacent pair with repeated and distinct weights | Edge occurrence, tie-breaking, and multigraph hot paths. |
| `loopHeavy` | Loop on a fixed fraction of nodes plus ordinary edges | Degree, cycle, and path loop semantics. |
| `churnedSparse` | Build, remove deterministic nodes/edges, then add more | Sparse stable indexes and dense-snapshot translation. |

Size tiers are workload-dependent rather than one global matrix:

| Tier | Linear / `O((V+E) log V)` | Quadratic | Cubic / path-enumerating | Use |
| --- | ---: | ---: | ---: | --- |
| Unit | 0-64 nodes | 8-32 | 4-12 | Fast properties and oracle checks on every PR. |
| Quick benchmark | 1,000 and 10,000 | 128 and 512 | 24 and 64 | Manual harness smoke and routine local comparison. |
| Full benchmark | 100,000 | 1,000-2,000 | 128-256 | Dedicated-machine release investigation only. |

Cap each workload based on its documented complexity. Never run Floyd-Warshall, all-path enumeration, or Brandes-like
analytics at the same sizes as BFS. The reference benchmark's explicit betweenness cap is the precedent
([`.repos/graph/bench/compare/run.ts`](../../.repos/graph/bench/compare/run.ts#L36-L44)).

## Correctness Normalization

All adapters return normalized semantic values before comparison:

| Result | Normal form |
| --- | --- |
| Node set | Ascending neutral node ordinal. |
| Ordered Effect traversal | Exact Effect `NodeIndex` sequence; compare only to a hand-written reference traversal using insertion order. |
| Components / SCCs | Sort ordinals within each component, then sort components lexicographically. |
| Path | `{ reachable, distance, nodes, edgeIds }`; verify endpoints, edge continuity, direction, and recomputed weight before any oracle comparison. |
| Oracle shortest path | Compare reachability and minimum distance. Do not compare the chosen node/edge sequence when equal-cost alternatives exist. |
| Topological result | Verify every node occurs once and every directed edge has `position(source) < position(target)`; test Effect's tie order separately. |
| Cycles | Edge-ID sequence canonicalized by minimum rotation; for undirected cycles also choose the lexicographically smaller orientation. Keep loop and two-parallel-edge cycles distinct. |
| Floating scores | Map by neutral ordinal, verify finite values and normalization invariant, then compare with documented absolute plus relative tolerance. |
| Spanning tree / forest | Canonical edge-ID set plus component count, acyclicity, coverage, and total weight. Do not require the same edges under ties. |

Never normalize away behavior that Effect promises. In particular, separate assertions must retain public index holes,
edge occurrence counts, and insertion order. The reference differential suite correctly canonicalizes only unordered
component results ([`.repos/graph/tests/differential/oracle.test.ts`](../../.repos/graph/tests/differential/oracle.test.ts#L50-L55))
and compares shortest-path weights rather than selected paths
([`.repos/graph/tests/differential/oracle.test.ts`](../../.repos/graph/tests/differential/oracle.test.ts#L102-L130)).

## Algebraic and Property Tests

### Core graph laws

Run each applicable law for both kinds and over rich multigraph fixtures:

- `reverse(reverse(g))` is structurally equal to `g`, including edge IDs/data, allocator state, loops, parallel-edge
  order, and sparse indexes; `reverse(g)` is a no-op structurally for undirected graphs.
- Empty mutation preserves structural equality, hash, allocator state, node order, and edge order.
- Mutating a graph does not change the source graph; finalization prevents further writes to the mutable handle.
- Add/update/remove command sequences agree with a small independent `Map`-based model. Removing a node removes exactly
  its incident edge occurrences and never reuses indexes.
- `mapNodes(identity)`, `mapEdges(identity)`, `filterNodes(always)`, and `filterEdges(always)` preserve structure.
- Node filtering leaves exactly the induced edge multiset. Edge filtering preserves all nodes and selected edge IDs.
- Directed reverse swaps predecessor/successor sets and preserves degree totals. Undirected endpoint reversal is
  semantically equal.
- `compose` is idempotent under its documented set identity; intersection/difference/symmetric-difference obey their
  membership laws using occurrence-aware expected models. Do not assume bag laws where current set operations
  deliberately deduplicate equal identities, as pinned by
  [`Graph.test.ts`](../../packages/effect/test/Graph.test.ts#L459-L494).
- Equal immutable graphs have equal hashes. Do not assert the invalid converse that unequal graphs must have unequal
  hashes.

### Query and algorithm laws

- Neighbor queries are duplicate-free and ordered by first incident edge occurrence; incident-edge queries retain every
  parallel edge occurrence.
- Sum of directed in-degrees and out-degrees is `E` each. Sum of undirected graph-theoretic degrees is `2E`, including
  loops contributing two. Validate these independently from adjacency storage.
- A directed loop and undirected loop are cycles; two parallel undirected edges are a cycle; one undirected edge is not.
- `isBipartite` is invariant under edge orientation for undirected input, rejects every loop, accepts even cycles, and
  rejects odd cycles. Validate returned partitions when an additive API supplies them.
- Connected components partition all nodes and every edge remains within one component. SCCs partition all directed
  nodes, are mutually reachable internally, and the condensation graph is acyclic.
- BFS depths are nondecreasing. DFS/BFS/DFS-postorder yield each reachable node once, obey radius bounds, and restart
  deterministically on every iteration.
- A topological order is a permutation satisfying all edges; one exists exactly when a directed graph is acyclic.
- Every returned path is valid and its reported distance equals its edge sum. Dijkstra, Bellman-Ford, Floyd-Warshall,
  and A* with a zero heuristic agree on nonnegative fixtures. Bellman-Ford and Floyd-Warshall agree on negative-edge,
  no-negative-cycle DAGs.
- Adding a dominated heavier parallel edge cannot improve a shortest distance. Adding a nonnegative self-loop cannot
  improve one. Removing an unused edge from a uniquely shortest path fixture does not change that result.
- A* with an admissible grid heuristic returns the Dijkstra distance. An inconsistent but admissible heuristic gets a
  dedicated regression fixture if the implementation claims to support reopening.
- Floyd-Warshall diagonal distances are zero without a negative cycle, its finite distances satisfy triangle
  inequalities, and each reconstructed path matches the matrix distance.

The richer property family is the authority for multigraph behavior. The reference repository uses the same split
between simple oracle graphs and rich self-property graphs
([`.repos/graph/tests/differential/generators.ts`](../../.repos/graph/tests/differential/generators.ts#L29-L37),
[`properties.test.ts`](../../.repos/graph/tests/differential/properties.test.ts#L24-L27)).

## Differential Oracle Matrix

Every oracle group starts with one hand-computed fixture that proves both adapters implement the intended convention.
Only then run the seeded matrix. This prevents two adapters from agreeing on the wrong interpretation, following
[`oracle.test.ts`](../../.repos/graph/tests/differential/oracle.test.ts#L21-L28).

| Effect behavior | Graphology oracle | Domain | Comparison and limits |
| --- | --- | --- | --- |
| Neighbor/predecessor/successor sets and degree | Graphology core | Simple directed/undirected; degree may additionally use rich multi graphs after pinned loop checks | Compare sets/counts only. Effect insertion order and occurrence-preserving edge APIs use independent properties. |
| Connected components | `graphology-components` | Undirected simple and rich; directed only if Effect later exposes explicitly weak components | Canonical partitions. Current `connectedComponents` accepts undirected graphs, so do not silently broaden its contract. |
| Strongly connected components | `graphology-components` SCC implementation | Directed simple; rich after loop/parallel hand checks | Canonical partitions, plus independent condensation law. |
| Dijkstra | `graphology-shortest-path` | Positive-weight simple directed/undirected | Reachability and distance. Graphology node paths cannot oracle Effect edge identity or tie order. |
| Bellman-Ford, Floyd-Warshall, A* | Graphology Dijkstra as a cross-algorithm oracle | Nonnegative simple graphs only | Compare distances. Negative edges/cycles and heuristic behavior require independent properties. |
| BFS reachability | Graphology neighbor APIs with a minimal queue | Simple directed/undirected | Reachable set and depth only; Effect traversal order remains independently specified. |
| PageRank, betweenness, eigenvector centrality when added | `graphology-metrics` | Start with simple graphs and exactly matched options/normalization | Numeric tolerance after hand checks. Parallel-edge path multiplicity, loops, convergence, and tie semantics remain independent until explicitly proven equivalent. The reference suite documents these tolerance and option hazards ([`oracle.test.ts`](../../.repos/graph/tests/differential/oracle.test.ts#L193-L203), [`oracle.test.ts`](../../.repos/graph/tests/differential/oracle.test.ts#L411-L445)). |

Do not use Graphology as the authority for:

- structural equality/hashing, stable numeric allocation, mutation scopes, set-operation identity, or deterministic
  insertion order;
- occurrence-preserving incident edges and selected edge identity through parallel-edge paths;
- Effect's explicit cycle rule that two parallel undirected edges form a cycle;
- negative-cycle validation, invalid weight/heuristic errors, or `Option`/`GraphError` behavior;
- lazy/eager pairing, interruption checkpoints, or output formats;
- any algorithm whose options or normalization cannot be made identical.

Graphology itself supports multigraphs, but support is not semantic equivalence. Admit a rich oracle case only after a
small loop and parallel-edge fixture demonstrates the same convention. Otherwise use algebraic laws or a deliberately
simple independent implementation bounded to unit-size graphs.

## Deterministic Complexity Guards

Elapsed-time assertions such as those in the reference read-path regression suite
([`perf-regression.test.ts`](../../.repos/graph/tests/perf-regression.test.ts#L20-L75)) are too machine-dependent for the
normal Effect suite. Retain its stronger idea: count observable work, as its lazy-path checks count indexed reads rather
than time ([`perf-regression.test.ts`](../../.repos/graph/tests/perf-regression.test.ts#L78-L145)).

Define a non-public probe vocabulary owned jointly with the internal architecture plan:

```ts
type GraphAlgorithmProbe = {
  nodeDiscovered(): void
  nodeDequeued(): void
  arcExamined(edge: Graph.EdgeIndex): void
  relaxationAttempted(edge: Graph.EdgeIndex): void
  queuePush(): void
  pathEdgeMaterialized(edge: Graph.EdgeIndex): void
  checkpoint(): void
}
```

Public wrappers pass no probe. Tests import internal kernels or construct them through a test-only internal factory; do
not add public options, ambient globals, proxies, or production branching solely for tests. The internal architecture
plan owns probe plumbing through the shared ordered arc iterator and dense snapshot. This plan owns fixtures and bounds.

Add deterministic guards for:

- BFS, DFS, components, SCC, topological sort, and acyclicity: discovered nodes `<= V`, arc examinations bounded by the
  documented directed/undirected arc expansion, and doubling `V + E` doubles work within a small additive constant.
- Dijkstra/A*: weight validation and arc examinations are linear in the reachable graph; heap pushes are bounded by
  successful relaxations plus initialization. Do not assert a particular heap implementation.
- Bellman-Ford: at most `(V - 1)E` relaxation attempts plus one negative-cycle pass; early exit is asserted only on a
  fixture designed for it.
- Floyd-Warshall: exact or tightly bounded `V^3` transition count over dense positions; sparse public indexes must not
  change the count.
- Queries and transforms: predicate/mapper invocation counts equal the relevant node or edge occurrence count. Reverse
  and filtering remain linear under size doubling.
- Lazy APIs added by later plans: consuming zero, one, or `k` results materializes only those result paths/cycles plus
  unavoidable search state. Full collection is a sanity check that all results are eventually materialized.
- Checkpoint-enabled kernels: checkpoint counts scale at the documented cadence and are independent of wall time.

Use exact counts where the contract is implementation-independent; otherwise assert asymptotic bounds and ratios on
`n`, `2n`, and `4n`. Each guard must include a deliberately quadratic or eager local fake in its test development history
to prove the bound would fail. Do not retain the fake.

## Microbenchmarks

Register Effect-only scenarios under the `graph` runtimeperf suite. Each factory returns `{ run, validate }`, matching
the existing fixture contract ([`runtimeperf/README.md`](../../packages/effect/runtimeperf/README.md#fixture-contract)).
Validation must run before and after measurement, as the worker already guarantees
([`worker.mts`](../../packages/effect/runtimeperf/worker.mts#L33-L54),
[`worker.mts`](../../packages/effect/runtimeperf/worker.mts#L124-L148)).

Required scenario families:

- `build`: cold construction from a neutral spec; validate counts and corpus fingerprint.
- `lookup`: batched `getNode`, `getEdge`, `hasNode`, and `hasEdge` over a deterministic index schedule, including a
  churned sparse graph.
- `adjacency`: full neighbors/predecessors/successors sweeps on sparse, star, loop-heavy, and parallel-heavy shapes.
- `mutation`: one scoped batch of adds, updates, edge removals, and node removals from a prebuilt source.
- `transform`: reverse, node/edge map/filter, induced neighborhood, and set operations.
- `traversal`: fully consume BFS, DFS, DFS-postorder, topo, components, SCC, acyclicity, and bipartite checks.
- `shortest-path`: Dijkstra, zero-heuristic and grid-heuristic A*, Bellman-Ford, and Floyd-Warshall at complexity-appropriate
  tiers. Separate reachable, unreachable, equal-weight, parallel-edge, and sparse-index scenarios.
- `lazy`: first result, first 10 results, and full collection for future lazy APIs. Never benchmark creating an iterator
  without consuming the intended amount.
- Future algorithms add scenarios only after correctness/property coverage and validation are complete.

Keep setup and result validation outside `run`; consume iterators and return a semantic scalar or compact checksum so
dead work cannot disappear. Let runtimeperf calibrate batches instead of hard-coding iteration counts. Record graph
`V`, `E`, kind, shape, seed, fingerprint, operation, cold/steady state, and expected complexity in registry metadata.

Use `pnpm runtimeperf graph/<case>` for exploratory absolute numbers and
`pnpm runtimeperf-compare graph/<case> --base main --head HEAD` for authoritative source-change comparisons. The harness
already uses independent worker processes and treats those processes, not Tinybench's internal samples, as statistical
observations ([`runtimeperf/README.md`](../../packages/effect/runtimeperf/README.md#measurement-model)).

## Cross-Library Benchmark Harness

Extend the runtimeperf `graph` suite with implementations grouped by a shared `scenario`, so existing rotating order and
paired ratio reporting apply ([`run.mts`](../../packages/effect/runtimeperf/run.mts#L53-L98)). Initial competitors:

- Graphology for build, adjacency/degree, BFS reachability, Dijkstra, components, and supported analytics.
- ngraph for build, directed traversal, degree sweep, and idiomatic `ngraph.path` shortest path.
- `@dagrejs/graphlib` for build, traversal, components, and its available all-target Dijkstra, clearly labeled as a
  different API cost.

Do not add Cytoscape initially: it is primarily a visualization toolkit and makes the matrix slower without improving
coverage of Effect's graph-kernel decisions. Add another library only when it has an idiomatic equivalent operation and
the maintenance cost is justified.

Fairness requirements:

- Every adapter builds from the same simple directed or simple undirected `GraphSpec`; cross-library cases never use
  loops or parallel edges unless every compared adapter has demonstrated matching semantics.
- Call each library's public, idiomatic API. A minimal traversal loop over a public neighbor API is allowed only when the
  library has no traversal helper, and must be identical in purpose across adapters.
- Mark unsupported operations as unavailable rather than implementing a competitor's missing algorithm in the harness.
- Separate build from steady-state operations. Warm any lazy index consistently before steady-state timing and record
  that policy in scenario metadata.
- Validate every adapter's output against the normalized expected result before timing. A benchmark that computes a
  different answer is invalid, not merely a slow or crashed cell.
- Label non-equivalent APIs prominently. The reference adapter's graphlib Dijkstra caveat is a good example
  ([`.repos/graph/bench/compare/adapters.ts`](../../.repos/graph/bench/compare/adapters.ts#L178-L205)).
- Cross-library results are diagnostic; base/head Effect comparisons are authoritative, matching current runtimeperf
  policy ([`runtimeperf/README.md`](../../packages/effect/runtimeperf/README.md#L10-L12)).

## Memory and Allocation Measurement

Do not infer memory from ordinary timing workers. Add a separate opt-in runtimeperf mode with fresh processes and
`--expose-gc`:

1. Build or run one validated warmup, release warmup results, and force GC.
2. Record `process.memoryUsage()` and V8 heap statistics.
3. Build/run `k` identical independent fixtures, retaining only the values named by the scenario.
4. Force GC and record the post-state.
5. Report `(post - pre) / k` retained heap, `heapTotal`, `external`, and `arrayBuffers`, with raw before/after values.
6. Repeat in independent workers and report median and MAD. A negative delta is retained as raw noise, not clamped.

Measure these separately:

- retained bytes per node/edge after graph construction;
- temporary retained bytes after traversal/shortest-path completion with results released;
- retained result size for all-pairs and eager multi-result APIs;
- lazy iterator retained size before consumption, after one result, and after full consumption;
- dense-snapshot/cache retained size before and after first hot-algorithm use.

Heap deltas do not measure total allocation churn. For allocation investigations, add an opt-in Node Inspector
`HeapProfiler.startSampling` mode (or `--heap-prof` artifact) and report sampled allocated bytes by stack. Sampling
profiles are diagnostic artifacts only: do not gate CI on them or compare them as exact counts. Prefer deterministic
`pathEdgeMaterialized`, queue-push, snapshot-build, and array-capacity probe counts when those answer the regression
question.

Memory fixtures must run one scenario per process, record Node/V8 version and flags, and avoid sharing cached Graph
instances across samples. Compare base/head on the same machine with alternating order; do not publish cross-machine
byte deltas as regressions.

## Result Reporting

Retain runtimeperf's JSON as the source of truth and add Graph-specific metadata without creating a second timing
harness. Each report must contain:

- schema version, run ID, Git refs and dirty-state hash;
- Node, V8, OS, architecture, CPU model, core count, and relevant Node flags;
- exact package versions for all adapters;
- fixture name, kind, shape, requested/actual `V` and `E`, seed, corpus fingerprint, and size tier;
- operation, implementation, setup/warm-state policy, expected complexity, batch size, execution order, all worker
  measurements, median, MAD, and statistical comparison;
- validation checksum and status;
- memory raw snapshots or allocation-profile artifact path when that mode is used;
- explicit statuses for unsupported, invalid-adapter, timeout, crash, and skipped-by-size-cap.

Generate a Markdown summary from JSON rather than editing result tables manually. Show Effect base/head first, then
cross-library ratios. Flag sub-resolution and high-variance cells instead of ranking them. Include methodology and
fairness notes beside every generated table. The reference reports capture environment and generate documentation from
JSON ([`.repos/graph/docs/benchmarks.md`](../../.repos/graph/docs/benchmarks.md#L176-L209)); Effect should keep generated
artifacts under `tmp/runtimeperf/results/` rather than committing machine-specific numbers.

## CI Policy

| Gate | Trigger | Contents | Failure policy |
| --- | --- | --- | --- |
| Graph unit/property | Every PR through normal targeted/package tests | Hand examples, fixed smoke seeds, bounded fast-check properties, deterministic complexity guards | Required. Fail on semantic mismatch, replayable property failure, or operation-count bound. |
| Differential | Every PR when Graph tests run | Unit-size simple corpus against Graphology plus rich independent laws | Required. No network and no timing assertions. |
| Runtimeperf harness tests | Changes under `runtimeperf` or Graph benchmark fixtures | Registry/materialization/worker/report tests with tiny fixtures | Required. Verify the harness, not speed. |
| Quick benchmark smoke | Manual dispatch, optionally nightly | Unit/quick subset, one or two shapes per complexity class, all installed adapters | Fail only on harness error, invalid result, missing artifact, or crash in a required Effect case. Never fail on shared-runner timing. |
| Base/head performance | Maintainer-invoked or dedicated runner | Selected affected Effect scenarios with paired rounds | Informational by default; `--fail-on-regression` only after maintainer review and existing statistical classification. |
| Full cross-library and memory | Manual dedicated machine | Full size matrix, retained-memory workers, optional allocation profiles | Artifact only. Never a PR gate. |

Shared CI runners are unsuitable for canonical timing. The reference repository's benchmark workflow is manual and
uploads JSON solely to prove reproducibility ([`.repos/graph/.github/workflows/bench.yml`](../../.repos/graph/.github/workflows/bench.yml#L1-L11));
use the same policy.

When a deterministic guard and a timing result disagree, investigate both, but do not weaken the deterministic bound
because a noisy timing run happened to pass. Timing regressions require reruns on the same quiet machine, inspection of
raw rounds, and a correctness check before action.

## Implementation Phases

### Phase 1: Corpus and adapters

1. Add the neutral PRNG/spec generator, shape builders, size tiers, fingerprints, and Effect adapter.
2. Add unit tests for deterministic PRNG output, exact sizes, edge validity, simple/rich constraints, and adapter
   preservation of node/edge identity.
3. Add Graphology development dependencies and adapter, with hand-checked loop/parallel probes documenting admitted and
   excluded domains.

Success criteria:

- The same `(shape, size, seed, kind)` yields byte-for-byte identical neutral specs and fingerprints across runs.
- Effect adaptation preserves exact edge occurrence and insertion order and can represent sparse public indexes.
- Oracle adapters reject unsupported semantics rather than silently coercing them.

### Phase 2: Property and differential verification

1. Add core/model laws and rich multigraph properties.
2. Add hand-checked oracle fixtures, then the simple seeded differential matrix.
3. Add normalization helpers and ensure every failure reports replay metadata.
4. Migrate no existing readable example unless duplication becomes materially expensive.

Success criteria:

- Every current Graph algorithm has at least one algebraic/metamorphic law in addition to examples.
- Every oracle comparison is preceded by a hand-computed convention check.
- Loops, parallel edges, disconnected graphs, sparse indexes, equal weights, and invalid weights each occur in dedicated
  rich properties.
- Restoring a known prior bug or introducing an adapter direction error causes a focused property/differential failure.

### Phase 3: Deterministic complexity instrumentation

Depends on the internal architecture/performance-kernel plan for the ordered arc iterator, dense snapshot, and internal
probe plumbing. The probe vocabulary and tests can be prepared earlier; production plumbing lands with that plan.

1. Instrument internal kernels without changing public signatures or behavior.
2. Add exact/asymptotic count guards and lazy-materialization checks.
3. Verify each bound against `n`, `2n`, and `4n` fixtures and against sparse-index variants.

Success criteria:

- Normal test execution contains no wall-clock threshold for Graph complexity.
- A linear-to-quadratic adjacency regression and eager path materialization both fail deterministically.
- Probe-disabled production paths have no observable semantic difference; benchmark the probe-disabled path only.

### Phase 4: Runtimeperf Graph suite

1. Generalize registry coverage metadata where current schema-specific `astTags` assumptions require it
   ([`utils.mts`](../../packages/effect/runtimeperf/utils.mts#L218-L228)); do not fake Graph AST tags.
2. Register validated Effect microbenchmarks by complexity tier.
3. Add targeted registry, worker, materialization, and report tests.
4. Document commands and interpretation in `runtimeperf/README.md`.

Success criteria:

- Every registered case validates before and after timing and returns synchronously.
- `runtimeperf-compare` can materialize Graph fixtures in base/head worktrees without importing the current worktree's
  fixture code.
- Quick and selected base/head runs emit complete reproducible JSON with corpus fingerprints.

### Phase 5: Cross-library, memory, and CI reporting

1. Add only semantically comparable competitor adapters and normalized preflight validation.
2. Add opt-in retained-memory workers and allocation-profile artifacts.
3. Add JSON-to-Markdown Graph summaries and the manual quick workflow.
4. Run a clean-checkout rehearsal before treating the harness as maintained infrastructure.

Success criteria:

- Every cross-library cell uses identical neutral input and records unsupported operations honestly.
- Shared-runner jobs never fail due to timing ratios.
- Memory reports isolate scenarios in fresh `--expose-gc` workers and retain raw readings.
- A result can be reproduced from its command, Git refs, seed, fingerprint, versions, and Node flags.

## Dependencies and Coordination

- Requires the correctness-contract plan and the shared semantics in [`README.md`](./README.md#shared-semantics).
- May begin before algorithm expansion: corpus generation, current properties, current Graphology checks, and runtimeperf
  registry work are independent.
- Deterministic kernel probes require the internal architecture/performance plan. That plan owns the ordered arc iterator,
  dense snapshot, and probe plumbing; this plan owns probe names, fixtures, and assertions.
- Each later domain plan owns algorithm-specific examples and properties, but must register shared fixtures and
  benchmarks here rather than create private generators or timing scripts.
- Effect-native interruption tests depend on the later checkpoint implementation. This plan reserves deterministic
  checkpoint counts but does not introduce asynchronous timing tests.
- Graphology oracle dependencies should land with the first differential tests. ngraph/graphlib dependencies should land
  only with cross-library scenarios that use them.
- No changeset is needed for development-only tests, fixtures, benchmark infrastructure, or documentation.

## Verification Commands for the Implementation

Use targeted commands while phases land; never run the unbounded whole-suite/watch commands:

```sh
pnpm lint-fix
pnpm --filter effect test --run test/Graph.test.ts
pnpm --filter effect test --run test/GraphProperty.test.ts
pnpm --filter effect test --run test/GraphDifferential.test.ts
pnpm --filter effect test --run test/GraphComplexity.test.ts
node --test packages/effect/runtimeperf/test/*.test.mts
pnpm check
```

Performance verification is explicit and non-gating unless requested:

```sh
pnpm runtimeperf graph
pnpm runtimeperf graph/<scenario>
pnpm runtimeperf-compare graph/<scenario> --base main --head HEAD
pnpm runtimeperf-compare graph --base main --head HEAD --fail-on-regression
```

The implementation should add documented selectors for quick cross-library and memory modes before advertising exact
commands for those modes. Do not overload ordinary `pnpm test` with benchmarks or GC/profile workers.

## Completion Criteria

This foundation is complete when:

- correctness, property, differential, deterministic-complexity, microbenchmark, and cross-library suites consume one
  versioned neutral corpus;
- every random failure is replayable and every unordered result has an explicit normal form;
- Graphology is used only inside proven-equivalent domains, while Effect multigraph/self-loop/index/order semantics are
  protected by independent laws;
- operation-count guards cover the hot asymptotic contracts without brittle elapsed-time assertions;
- runtimeperf produces validated, base/head-comparable Graph results with raw rounds, environment, versions, seed, and
  corpus fingerprint;
- retained-memory and allocation diagnostics are isolated, opt-in, and never presented as deterministic CI facts;
- CI blocks semantic and complexity regressions, verifies the benchmark harness, and leaves noisy performance judgment
  to paired runs on controlled hardware.
