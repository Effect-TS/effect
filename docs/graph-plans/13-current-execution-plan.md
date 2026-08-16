# Current Graph Execution Plan

## Purpose

This document translates the domain plans into work that can be implemented from the current `main` baseline after:

- `e811353e3b`: detached public edge envelopes and finite A* heuristics;
- `189b003a23`: `Graph.Snapshot`, `Graph.fromSnapshot`, and `Schema.Graph`;
- `a371754b1e`: CSR-backed traversal and algorithm optimization.

The [master roadmap](./12-master-roadmap.md) remains authoritative for shared semantics and ownership. This document owns
current implementation status and PR order. A domain plan saying that work is "committed" means approved roadmap scope,
not that its API already exists.

`MixedGraph` and a visual/interchange graph representation are separate design proposals. They are not hidden
prerequisites for this execution plan.

## Current State

### Implemented foundations

- Immutable and scoped-mutable directed/undirected graphs with stable numeric indexes.
- Snapshot/Schema round-tripping of active indexed topology.
- CSR compact-node translation with lazy outgoing/incoming adjacency and mutation invalidation.
- Iterator-time traversal snapshots: active iterators are mutation-isolated and fresh iterators see current state.
- Stack-safe CSR DFS, BFS, postorder, topo, cycle/component/SCC, and substantial immutable weighted-path machinery.
- Head-index or typed FIFO queues in the main traversal paths.
- Compact predecessor edge positions in immutable Dijkstra, A*, and Bellman-Ford.
- DOT and Mermaid legacy emitters.

### Not implemented by the traversal work

- The Plan 02 fixture/property/differential/complexity/runtimeperf foundation.
- Stable compact-position to public `EdgeIndex` projection and one edge-aware ordered-arc contract.
- Any Plan 04 public query or subgraph export.
- Any Plan 05 public `Path`, path utility, or path-enumeration export.
- Any new Plan 06 connectivity/DAG export.
- Plan 07 optimization families, Plan 08 analytics, or Plan 09 generators.
- Effect-native algorithm variants, emitter hardening options, or the consolidated Graph guide.

## Track A: Stabilize Existing APIs

These PRs precede additive public APIs. Keep behavior fixes separate from internal performance changes so each changeset
states exactly what became observable.

### A0. Correct hash tests and settle equality semantics

Classification: tests/docs plus an approved compatibility-sensitive runtime correction.

- Remove tests asserting that unequal graphs must have different hashes. Require only equality implying equal hash.
- Document Effect's immutability requirement after hashing transitively contained payloads.
- Remove allocator history from structural `Equal` / `Hash`. Active indexed structure and payloads determine equality,
  matching the information preserved by `Schema.Graph`.

Exit: law-correct tests cover graph kind, sparse indexes, undirected endpoint reversal, loops, and parallel edges.

Changeset: none unless runtime equality/hash changes.

### A1. Traversal inputs and root ordering

Classification: confirmed contract bugs.

- Add one validator shared by `neighborhood`, `dfs`, `bfs`, and `dfsPostOrder`.
- Accept omitted radius, `Infinity`, `-0`, and non-negative integers. Reject `NaN`, `-Infinity`, negatives, and fractions.
- Validate and copy `start` when constructing a walker.
- Revalidate copied starts against every fresh iterator's CSR snapshot. A removed start throws the documented
  missing-node `GraphError`; it never enters compact storage as `undefined`.
- Make DFS prioritize the first distinct supplied root, matching BFS and postorder. Ignore duplicate roots after their
  first occurrence.
- Preserve the documented finite-radius postorder membership pass.

Tests: invalid-radius matrix, empty starts, data-first/data-last, caller mutation of `start`, start removal between walker
and iterator creation, active iterator isolation, repeated fresh iteration, and disconnected multi-root order.

Changeset: `effect` patch identifying invalid-radius rejection and DFS multi-root ordering as compatibility-sensitive.

### A2. Unique directed neighbor queries

Classification: confirmed bug under the binding unique-neighbor contract.

- Deduplicate only public `neighbors`, `successors`, `predecessors`, and deprecated `neighborsDirected` collection.
- Preserve first edge occurrence order in cold canonical and warm CSR paths.
- Do not deduplicate algorithm arcs, topo in-degree, parallel edges, or future degree/incident-edge operations.

Tests: outgoing/incoming parallel edges, loops, reciprocal edges, mutable/cold/warm inputs, and weighted/topo regression
fixtures proving physical edge multiplicity remains intact.

Changeset: `effect` patch.

### A3. Allocator exhaustion

Classification: confirmed bug with approved boundary contract.

Contract: `Number.MAX_SAFE_INTEGER` is a valid existing or newly allocated index, but the next allocation
throws a stable `GraphError` before changing maps or adjacency. Never expose an unsafe integer or overwrite an entry due
to floating-point saturation.

Tests: snapshots ending at `MAX_SAFE_INTEGER - 1` and `MAX_SAFE_INTEGER`, node and edge exhaustion, no partial writes,
error precedence, ordinary sparse allocation, and Schema decoding.

Changeset: `effect` patch.

### A4. Scoped mutation error precedence

Classification: confirmed bug for lifecycle misuse.

- Preserve the callback's original error when cleanup also discovers manual finalization.
- Manual finalization followed by normal callback return continues to produce a lifecycle `GraphError`.
- Ordinary callback failure still finalizes an active handle, and retained handles reject later mutation.
- Keep direct `endMutation` single-use.

Tests: double finalization; manual finalization plus normal return; manual finalization plus sentinel throw; constructor and
`mutate` forms; retained-handle query/mutation behavior.

Changeset: `effect` patch.

### A5. Undirected self-loop invariant hardening

Classification: internal risk, not yet a demonstrated additional public bug.

- Add a test-only invariant checker for canonical adjacency and CSR projections.
- Cover parallel loops, loop-bearing node removal, hydration, remove/re-add, cycle, bipartite, traversal, and weighted
  behavior.
- Do not normalize the private duplicate-incidence layout merely for aesthetics. Change it only if a regression proves
  stale or over-counted public behavior, or if the ordered-arc kernel requires a simpler representation.
- Preserve one logical edge, one edge enumeration, one neighbor, one traversal step, and graph-theoretic degree two.

Changeset: none for tests/internal parity; patch only for demonstrated runtime correction.

### A6. Finish linear queues and reconstruction

Classification: internal performance parity.

- Replace remaining mutable `isBipartite` and mutable Bellman-Ford `shift()` loops with head cursors.
- Replace mutable Bellman-Ford `unshift()` reconstruction with append-and-reverse.
- Preserve exact immutable/mutable ordering, selected costs, and errors.

Changeset: none if observable output is identical.

### A7. Stable CSR edge identity

Classification: internal prerequisite for Plans 04-07.

- Add compact-position to public-`EdgeIndex` projection without storing sparse public IDs in typed arrays.
- Add incoming adjacency with edge identity.
- Define one internal ordered arc operation for outgoing, incoming, and direction-ignored traversal.
- Unify mutable and immutable predecessor records around stable edge identity.
- Continue projecting legacy `{ path, distance, costs }` exactly; do not add fields to `PathResult`.

Tests: sparse edge IDs including values above 32-bit range, equal-data parallel edges, self-loops, undirected stored
orientation, immutable/mutable parity, and exact legacy result shape.

Changeset: none until an additive Plan 05 API exposes edge identity.

### A8. Mutable weighted callback semantics

Classification: approved contract correction.

Contract: Dijkstra, A*, and Bellman-Ford on a mutable graph capture one structural snapshot before invoking
user cost/heuristic callbacks. Reentrant structural mutation affects later calls, not the in-flight result. Payloads remain
shallow references and callback exceptions propagate unchanged.

Land only after A7 lets mutable and immutable algorithms share identity-preserving reconstruction. Benchmark the added
snapshot cost separately.

Changeset: `effect` patch if this contract is adopted.

### A9. Emitter defect probes

Classification: handoff to Plan 11.

- Add exact output and adversarial context fixtures for DOT and Mermaid.
- Use exact output and syntactic-containment assertions only. Do not add parser dependencies or claim external parser
  conformance.
- Change escaping only after a fixture demonstrates invalid output or statement injection.
- Keep escaping fixes separate from additive emitter options.

Changeset: one focused patch per demonstrated runtime-text correction.

## Track B: Shared Verification And Kernel Foundation

No remaining Stately-derived domain may create its own fixture generator, dense representation, edge projection, numeric
policy, or checkpoint mechanism.

### B1. Neutral graph corpus

- Add deterministic `GraphSpec` fixtures for chains, grids, stars, layered DAGs, dense graphs, loops, parallel edges,
  sparse indexes, and mutation churn.
- Add the Effect adapter, stable fingerprints, fixed seeds, and exact validity/order tests.

### B2. Properties and differential tests

- Add bounded seeded algebraic/model tests for existing Graph behavior.
- Add Graphology only with the first hand-checked differential suite; reject unsupported multigraph semantics rather than
  coercing them.
- Add deterministic operation-count probes for complexity regressions.

### B3. Graph runtimeperf

- Generalize Schema-specific runtimeperf metadata before registering Graph.
- Establish validated Effect-only build, traversal, mutation, path, and emitter baselines.
- Add competitor adapters, retained-memory modes, and publication only after the Effect suite is stable.

### B4. Shared algorithm policies

- Extract named weight/capacity validation policies and the deterministic heap where reuse is demonstrated.
- Add the no-op synchronous checkpoint/resumable-step seam only for kernels that can later justify Effect-native variants.
- Retain the landed CSR; do not introduce a competing dense snapshot.

## Track C: Port The Adopted Core

Each bullet is a separate reviewable public-API PR unless grouped explicitly.

### C1. Local edge and degree queries

Add:

- `incidentEdges`, `inEdges`, `outEdges`, `edgesBetween`;
- `degree`, `inDegree`, `outDegree`.

Do not add `sources` or `sinks`; existing `externals` already provides that capability. This first public tranche proves
the A7 ordered-arc and self-loop contracts before more complex algorithms depend on them.

### C2. Basic structural predicates

Add `hasPath`, undirected `isConnected`, and undirected `isTree`, reusing CSR reachability and existing acyclicity.

### C3. Index-preserving subgraphs

- Add an internal selected-structure copier preserving active indexes and in-memory allocator state.
- Expose `inducedSubgraph`.
- Expose explicit edge-selected `subgraph` only when Yen, transitive reduction, or another concrete consumer demonstrates
  public demand; otherwise keep the copier private.

### C4. Deterministic standard generators

Add `complete`, `path`, `cycle`, `grid`, and `tree`. They require no random service and provide reusable examples and
verification fixtures. Preserve automatic IDs and deterministic edge order.

### C5. Directed connectivity

Add `weaklyConnectedComponents`, `isWeaklyConnected`, and `isStronglyConnected`. Pin exact existing component/SCC order
before sharing their kernels.

### C6. Undirected cut structure

Add one iterative edge-aware low-link kernel and expose `bridges`, `articulationPoints`, and
`biconnectedComponents` with an edge-identifying result model.

### C7. Condensation and DAG transforms

- Add `condensationGraph` after SCC ordering is stable.
- Add `transitiveReduction` separately, with explicit DAG validation and bounded-memory strategy.
- Add `dominatorTree` in an independent PR; it is not a prerequisite for paths or reduction.

## Track D: Edge-Aware Paths

Keep the initial surface smaller than the original Plan 05 proposal.

### D1. Minimal path model

Add:

- `Path` with node and stable edge-index sequences;
- `isValidPath`;
- `pathFromEdges`.

Keep legacy `PathResult` unchanged. Keep `pathToResult` internal. Do not add trivial `pathNodes` / `pathEdges` accessors,
generic sequence helpers, or eager `collect*` aliases.

### D2. Path enumeration series

Land separately, in this order:

1. `shortestPaths` for all tied shortest paths;
2. lazy bounded `simplePaths`;
3. `shortestSimplePaths` using Yen or a justified alternative;
4. elementary `cycles`.

Every iterable must have fresh state, stable edge-identity ordering, bounded early-abandonment tests, and an exhaustive
small-graph oracle. `Array.from(...)` is the eager form; do not export redundant collectors.

Traversal visits and bidirectional Dijkstra remain benchmark/use-case gated.

## Track E: Analytics, Random Generators, And Optimization

### Adopted analytics order

1. Degree centralities after C1.
2. `coreNumbers` / `kCore`.
3. PageRank after numeric and checkpoint contracts.
4. Closeness after reusable single-source kernels.
5. Betweenness after tied-predecessor infrastructure.

Each family requires independent oracle, scaling, numeric, bundle, and API-placement review.

### Adopted random generators

After B1/B2 establish random ownership:

1. `erdosRenyi` and random DAG generation;
2. `connectedRandom` separately because exact terminating sampling is more complex.

Run a bundle comparison before importing `Effect` / `Random` into `Graph.ts`. Watts-Strogatz and Barabasi-Albert remain
internal benchmark fixtures unless concrete public uses justify an exact model contract.

### Approval-gated optimization families

These are not automatic Stately-parity work:

1. Minimum spanning forest/tree;
2. Eulerian path/circuit;
3. Maximum flow/minimum cut;
4. Maximum bipartite matching.

Each requires maintainer demand, API approval, independent properties/oracles, and bundle/performance evidence. Do not
combine families in one PR.

### Parked specialist analytics

Keep HITS, eigenvector, Katz, coloring, isomorphism, Louvain, and planarity outside active implementation waves until a
consumer and bundle budget are approved. Continue rejecting label propagation, Girvan-Newman, naive greedy modularity,
approximate TSP, and Steiner tree for this initiative.

## Track F: Final Layers

### Emitter hardening and options

After A9, fix only demonstrated DOT/Mermaid defects. Indentation, line separators, custom IDs, attributes, and Mermaid
edge IDs remain individually gated. Do not add formats, parsers, output hierarchy, or layout.

### Effect-native variants

Plan 10 remains last. Add a shared driver and one expensive pilot only after its synchronous kernel is finalized and
benchmarks show meaningful interruption/fairness need. Do not add Effect wrappers for symmetry.

### Consolidated Graph guide

Write the guide against shipped APIs and measured behavior: topology semantics, mutation lifecycle, snapshots/Schema,
parallel edges and loops, algorithm selection, complexity, output security, and benchmark methodology.

## Recorded Decisions

1. Equality/hash ignore allocator history and compare active indexed structure and payloads.
2. `MAX_SAFE_INTEGER` is allocatable once; subsequent allocation fails atomically.
3. Mutable weighted callbacks receive structural snapshot isolation.
4. Emitter tests use exact strings only and add no parser dependencies.
5. Only `inducedSubgraph` is initially public; explicit edge selection remains internal.
6. MST/forest is active; Euler, flow/cut, and matching remain parked.
7. Deterministic and random generators live in `Graph`; random generators are Effect-returning and use `Random`.

## Validation Per PR

Use only affected targets:

```sh
pnpm lint-fix
pnpm --filter effect test --run test/Graph.test.ts
pnpm test-types Graph.tst.ts
pnpm check
```

Add `GraphProperty`, `GraphDifferential`, `GraphComplexity`, runtimeperf, doctest, circular, or bundle commands only when
the corresponding PR changes those surfaces. Never run bare `pnpm test` or bare `pnpm doctest`.

## Immediate Sequence

Start with A0 through A4, which are small contract-focused PRs and do not depend on speculative APIs. Then land A5-A7
and B1-B3 in parallel where ownership does not overlap. C1 is the first additive public port and should not begin until A7
provides stable edge identity and B1 supplies shared multigraph fixtures.
