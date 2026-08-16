# Graph PR Delivery Plan

## Delivery Principles

This plan turns the [current execution plan](./13-current-execution-plan.md) into independently reviewable pull
requests. It covers approved work only. Parked algorithms and unapproved emitter options are listed as later gates, not
hidden inside active PRs.

Rules:

1. One observable correction or one additive API family per PR. Never mix a bug fix with new exports.
2. A PR may depend on at most one unmerged predecessor. Prefer landing the prerequisite and rebasing onto `main`.
3. Shared helpers land through their owner before consumers; consumers wait rather than clone them.
4. Parallel development is encouraged, but merges touching `Graph.ts`, `Graph.tst.ts`, or the same test section are
   serialized through a merge queue.
5. Every public PR includes runtime tests, type tests, JSDoc, a bounded doctest example, and one focused changeset.
6. Every performance claim has a validated baseline before implementation. No wall-clock unit-test assertions.
7. Failed experiments are removed. Do not retain dormant kernels, feature flags, or reserved exports.

Current execution note: benchmark/runtimeperf work is deferred. Skip B01, B02, V04, K05, F01-F03, emitter benchmark
work, and all benchmark commands for now. During this cycle K06 follows K04 directly. The PR definitions remain below so
the deferred work is not lost, but delivery agents must use the scoped instructions in
[`15-agent-execution-prompt.md`](./15-agent-execution-prompt.md).

## Dependency Overview

```text
Wave 0: existing behavior
  S01 -> S02 -> S03
  S04 -> S05
  S06 -> S07 -> S08

Wave 1: shared foundations
  V01 -> V02 -> V03
  K01 -> K02 -> K03 -> K04 -> K05 -> K06
  V01 + K02 -> V04
  B01 -> B02
  E01 -> E02/E03

Foundation checkpoint R1: S01-S07 + V01 + K01-K03

Wave 2: additive core lanes
  Q01 -> Q02 -> Q03
  Q04 -> C04
  G01 -> G02 -> R01 -> R02
  C01 -> C03
  Q01 -> C02
  C01 -> C05

Wave 3: edge-aware and analytical lanes
  K03 -> P01 -> P02 -> P03 -> P04 -> P05 -> P06
  Q02 -> A01/A02
  K04 -> A03
  P01 -> A04a -> A04b
  P02 + A04a -> A05
  P01 + K04 -> M01

Wave 4: optional final layers
  B02 + finalized expensive kernel -> F01 -> F02 -> F03
  shipped surface -> D01
```

The arrows express semantic dependencies. They do not require every lane to wait for unrelated work.

## Wave 0: Stabilize Existing Behavior

### S01. Correct Graph hash-law tests

Scope: tests and narrowly related documentation only.

- Remove assertions that unequal graphs must have different hashes.
- Add table-driven equality-implies-equal-hash coverage for kinds, sparse indexes, undirected endpoint reversal,
  self-loops, parallel edges, and undefined payloads.
- Do not change runtime equality or hashing.

Changeset: none.

### S02. Ignore allocator history in equality and hashing

Depends on S01.

- Remove allocator counters from immutable structural equality/hash.
- Preserve stable active indexes, payload equality, edge identity, undirected endpoint symmetry, and mutable reference
  equality/hash.
- Add equal pairs with identical active structure and different removed trailing allocation history.
- Document Effect's immutability expectation after transitively contained values are hashed.

Changeset: focused `effect` patch describing the compatibility-sensitive equality correction.

### S03. Make index exhaustion atomic

Depends on S02 because both alter allocator semantics and `internal/graph.ts`.

- Permit `Number.MAX_SAFE_INTEGER` as the final allocated node or edge index.
- Represent subsequent allocator state internally as exhausted.
- Throw before changing maps, adjacency, caches, or cycle metadata.
- Decode snapshots ending at the maximum into exhausted state.
- Pin endpoint-validation versus edge-exhaustion error precedence.

Tests cover `MAX_SAFE_INTEGER - 1`, the final successful allocation, repeated failure, no partial writes, and
`Schema.Graph` hydration.

Changeset: focused `effect` patch.

### S04. Stabilize traversal configuration

Can develop alongside S01-S03; serialize its merge because `Graph.ts` is a hotspot.

- Share radius validation across `neighborhood`, DFS, BFS, and postorder.
- Copy starts after eager validation and revalidate them for each fresh iterator snapshot.
- Make DFS honor first distinct root priority.
- Preserve active iterator snapshot isolation and bounded-postorder membership behavior.

Tests cover the complete invalid-radius matrix, empty starts, data-first/data-last calls, caller array mutation, start
removal between walker/iterator creation, active/fresh mutable iteration, duplicates, and disconnected root order.

Changeset: one `effect` patch describing invalid-radius rejection and DFS ordering.

### S05. Deduplicate directed neighbor-node queries

Depends on S04 for a clean traversal/order baseline.

- Deduplicate only `neighbors`, `successors`, `predecessors`, and deprecated `neighborsDirected`.
- Preserve first edge occurrence order in canonical and warmed CSR paths.
- Preserve every physical edge for topo, weighted algorithms, degree, and edge walkers.

Changeset: focused `effect` patch.

### S06. Fix scoped mutation error precedence

- Preserve the callback's original error when cleanup also detects manual finalization.
- Keep direct `endMutation` single-use.
- Manual finalization followed by normal callback return still raises the lifecycle error.
- Cover constructors, `mutate`, retained handles, and all post-finalization mutation entry points.

Changeset: focused `effect` patch.

### S07. Pin undirected self-loop invariants

Depends on S06. Tests first; change production storage only for a demonstrated failure.

- Add a test-local adjacency/CSR invariant checker.
- Cover parallel loops, loop-bearing node removal, hydration, remove/re-add, traversal, cycles, bipartiteness, and
  weighted paths.
- Preserve one logical edge/enumeration/neighbor/traversal step and graph-theoretic degree two.

Changeset: none unless tests demonstrate a runtime correction.

### S08. Finish mutable FIFO and reconstruction linearity

Depends on S07 for parity fixtures.

- Replace the remaining mutable `isBipartite` and Bellman-Ford `shift()` queues with head cursors.
- Replace mutable Bellman-Ford `unshift()` reconstruction with append-and-reverse.
- Do not change predecessor representation or adjacency access.

Changeset: none.

## Wave 1: Shared Verification And Kernel Foundation

These lanes intentionally separate test infrastructure, graph internals, performance infrastructure, and emitter
fixtures.

### Verification Lane

#### V01. Add the neutral seeded Graph corpus

Can begin immediately in parallel with Wave 0.

- Add `GraphSpec`, fixed PRNG output, named shape/size fixtures, fingerprints, and the Effect adapter.
- Include chains, stars, grids, layered DAGs, dense graphs, loops, parallel edges, disconnected graphs, and sparse-index
  mutation churn.
- Preserve exact insertion order and ordinal-to-public-index mappings.

Changeset: none.

#### V02. Add local algebraic and model properties

Depends on V01 and the relevant Wave 0 fixes.

- Add `GraphProperty.test.ts` for reverse/identity laws, source immutability, mutation-model equivalence, allocation,
  unique neighbors, edge occurrence preservation, traversal, paths, loops, and parallel edges.
- Use fixed replayable seeds and bounded shrinking.

Changeset: none.

#### V03. Add Graphology differential verification

Depends on V02.

- Add the dev-only oracle dependency and adapter in the same PR.
- Hand-check every admitted semantic domain before seeded comparisons.
- Compare semantic normal forms only; reject unsupported multigraph cases instead of coercing them.

Changeset: none.

#### V04. Add deterministic complexity probes

Depends on V01 and K02.

- Instrument separate test entry points for node discovery, arc examination, queue pushes, relaxations, path
  materialization, and snapshot builds. Checkpoint counts join this suite only when F02 introduces the seam.
- Add `GraphComplexity.test.ts` with `n`, `2n`, and `4n` deterministic bounds.
- Keep ordinary production hot paths free of optional per-arc test branches.

Changeset: none.

### Kernel Lane

#### K01. Add stable public edge-ID projection to CSR

Depends on S07.

- Add compact-position to public-`EdgeIndex` projection.
- Add incoming CSR with edge identity.
- Keep compact positions in typed arrays and sparse public IDs in JavaScript arrays.
- Test IDs above 32-bit range, loops, parallel edges, cache reuse, and mutation invalidation.

Changeset: none.

#### K02. Add the ordered-arc kernel

Depends on K01.

- Support outgoing, incoming, and direction-ignored traversal with early exit.
- Retain source, target, stable edge ID, authored direction, and multiplicity.
- Emit an undirected self-loop once as a traversal arc; retain parallel and reciprocal edges.
- Add direct internal contract tests before migrating consumers.

Changeset: none.

#### K03. Unify stable predecessor records and reconstruction

Depends on K02 and S08.

- Use stable edge identity in mutable and immutable Dijkstra, A*, and Bellman-Ford predecessor state.
- Share append-and-reverse reconstruction.
- Continue returning exactly legacy `{ path, distance, costs }` objects.
- Cover sparse/large edge IDs and equal-data parallel edges.

Changeset: none.

#### K04. Extract shared numeric policies

Depends on K03.

- Extract only policies consumed by current shortest paths and the approved MST/PageRank work.
- Preserve graph-global validation order and callback exception identity.

Changeset: none if behavior is identical.

#### K05. Extract the deterministic shared heap

Depends on K04 and B02.

- Share the current stable heap across Dijkstra/A* without changing insertion-sequence ties or stale-entry behavior.
- Do not add decrease-key, typed heaps, or new public selectors.
- Compare exact equal-priority paths and weighted runtimeperf before/after.

Changeset: none.

#### K06. Give mutable weighted algorithms snapshot isolation

Depends on K05 by merge order, though it consumes K03/K04 semantics.

- Capture complete topology and required projections before invoking cost/heuristic callbacks.
- Callback structural mutation affects later calls only; payloads remain shallow references.
- Cover add/remove/finalize mutations from callbacks, callback errors, ordinary parity, and snapshot overhead.

Changeset: focused `effect` patch.

### Runtimeperf Lane

#### B01. Generalize runtimeperf for non-Schema suites

Can develop alongside V01.

- Remove Schema-specific registry/report assumptions.
- Prove complete fixture-directory materialization into base/head worktrees.
- Do not add Graph benchmark cases yet.

Changeset: none.

#### B02. Register validated Effect-only Graph baselines

Depends on V01 and B01; merge after Wave 0 for meaningful baselines.

- Add build, lookup, CSR cold/warm, traversal, mutation, weighted path, and emitter cases.
- Validate before and after timing and return semantic checksums.
- Keep competitor adapters, retained-memory workers, and publication out of this PR.

Changeset: none.

### Emitter Fixture Lane

#### E01. Convert emitters to exact contract fixtures

Can run alongside kernel work; merge after S07.

- Replace partial substring tests with exact DOT/Mermaid outputs.
- Cover sparse order, callbacks, mutable call-time state, labels, loops, parallel edges, and adversarial containment.
- Add no parser dependencies and change no output.

Changeset: none.

#### E02. Fix demonstrated DOT defects

Depends on E01. Include only failing DOT contexts and exact expected changes.

Changeset: focused `effect` patch if output changes.

#### E03. Fix demonstrated Mermaid defects

Depends on E01. Keep separate from E02 and all additive options.

Changeset: focused `effect` patch if output changes.

## Release Checkpoint R1: Additive Core Ready

Required before the first new public Graph API:

- S01-S07 merged.
- V01 shared corpus available.
- K01-K03 stable edge identity, arcs, and reconstruction merged.
- No competing fixture, dense, edge projection, arc, or path reconstruction helper exists.

S08, V02/V03, B02, and emitter work continue independently and block only consumers that need them.

## Wave 2: Additive Core APIs

Use dedicated runtime files such as `GraphQueries.test.ts`, `GraphGenerators.test.ts`, and
`GraphConnectivity.test.ts` to reduce conflicts. Public declarations remain in `Graph.ts`.

### Query Lane

#### Q01. Add edge walkers

Add `incidentEdges`, `inEdges`, `outEdges`, and `edgesBetween` over K02.

Changeset: one additive `effect` changeset.

#### Q02. Add degree queries

Depends on Q01 contracts. Add `degree`, `inDegree`, and `outDegree`, including loop/parallel semantics and missing-node
zero behavior.

Changeset: one additive changeset.

#### Q03. Add structural predicates

Depends on Q01. Add `hasPath`, undirected `isConnected`, and undirected `isTree`.

Changeset: one additive changeset.

#### Q04. Add index-preserving induced subgraphs

Can run independently after R1.

- Add the private selected-structure copier and public `inducedSubgraph`.
- Preserve active indexes, kind, order, payloads, allocator state, and source independence.
- Keep exact edge-selected subgraphs private.

Changeset: one additive changeset.

### Generator Lane

#### G01. Add complete, path, and cycle generators

Add shared callback/context types only when used by this tranche.

Changeset: one additive changeset.

#### G02. Add grid and tree generators

Depends on G01 conventions. Keep coordinate/rank models in this PR rather than inflating G01.

Changeset: one additive changeset.

#### R01. Add Erdos-Renyi and random DAG generators

Depends on G02 and V01/V02.

- Keep APIs in `Graph` and return Effect values using the existing `Random` service.
- Verify `Random.withSeed`, draw order/counts, invalid-input no-draw behavior, simple topology, and DAG acyclicity.
- Run circular and bundle checks because `Graph.ts` gains Effect/Random dependencies.

Changeset: one additive changeset.

#### R02. Add exact-edge connected random generation

Depends on R01 random utilities. Keep separate because terminating no-replacement sampling and dense-complement behavior
need isolated review.

Changeset: one additive changeset.

### Connectivity Lane

#### C01. Add directed connectivity predicates

Add `weaklyConnectedComponents`, `isWeaklyConnected`, and `isStronglyConnected` after pinning existing component/SCC
order.

Changeset: one additive changeset.

#### C02. Add bridges, articulation points, and biconnected components

Depends on Q01 and K02. Keep the three exports together because one iterative low-link kernel computes the cohesive
result and splitting would duplicate temporary machinery.

Changeset: one additive changeset.

#### C03. Add condensation graphs

Depends on C01. Preserve component mapping and crossing edge identity in deterministic order.

Changeset: one additive changeset.

#### C04. Add transitive reduction

Depends on Q04 and existing topo. Keep standalone due to DAG validation, parallel-edge policy, reachability proof, and
bounded-memory strategy.

Changeset: one additive changeset.

#### C05. Add dominator trees

Depends on C01 ordering contracts. Keep standalone; it is not a prerequisite for other active families.

Changeset: one additive changeset.

## Wave 3: Paths, Analytics, And MST

### Path Lane

This lane merges mostly serially because every PR touches predecessor/arc/path code.

#### P01. Add the minimal `Path` model

Add `Path`, `isValidPath`, and `pathFromEdges`. Keep `PathResult` unchanged and conversion internal.

Changeset: one additive changeset.

#### P02. Add internal tied-predecessor reconstruction

Depends on P01. Add tie storage, zero-weight-cycle guards, deterministic edge-sequence order, laziness probes, and
small-graph oracles without public exports.

Changeset: none.

#### P03. Add all tied shortest paths

Depends on P02. Add `WeightedPath` and `shortestPaths` only. Do not add an eager collector.

Changeset: one additive changeset.

#### P04. Add bounded simple paths

Depends on P03 by delivery order, though it reuses only P01/K02 technically. Add stack-safe lazy `simplePaths` with
bounds and early-abandonment tests.

Changeset: one additive changeset.

#### P05. Add shortest simple alternatives

Depends on P04. Add `shortestSimplePaths` using Yen or a separately justified algorithm, with candidate identity,
banned-view reuse, deterministic ordering, and exhaustive small-graph `k` checks.

Changeset: one additive changeset.

#### P06. Add elementary cycle enumeration

Depends on P01 and lands after P05 to serialize source churn. Add lazy `cycles` with directed rotation and undirected
rotation/reversal canonicalization, loops, parallel two-cycles, bounds, and exhaustive oracles.

Changeset: one additive changeset.

### Analytics Lane

#### A01. Add degree centrality

Depends on Q02. Add degree, in-degree, and out-degree centrality together.

Changeset: one additive changeset.

#### A02. Add core decomposition

Depends on Q01/Q02. Add `coreNumbers` and `kCore` with a peeling oracle and linear-work probe.

Changeset: one additive changeset.

#### A03. Add PageRank

Depends on K04 and V04. Keep standalone due to numeric/convergence semantics, dangling nodes, weighted parallel edges,
checkpoint boundaries, and bundle impact.

Changeset: one additive changeset.

#### A04a. Add the reusable all-source distance kernel

Depends on P01/K04. Add no public exports. Prove unweighted/weighted parity, callback evaluation bounds, sparse-index
behavior, and no per-source CSR rebuilding.

Changeset: none.

#### A04b. Add closeness centrality

Depends on A04a. Add only the public options/result API, directed/disconnected normalization contracts, JSDoc, type tests,
and oracle comparisons.

Changeset: one additive changeset.

#### A05. Add betweenness centrality

Depends on P02 and A04a's reusable traversal machinery. Keep standalone because Brandes multiplicity, weighted positivity,
normalization, and multigraph semantics require independent review.

Changeset: one additive changeset.

### Optimization Lane

#### M01. Add minimum spanning forest/tree

Depends on P01 edge identity, K04 numeric policy, and V02/V03.

- Add deterministic Kruskal-based forest and tree APIs only.
- Cover disconnected/isolated nodes, negative weights, loops, parallel competition, sparse IDs, ties, and exhaustive
  small-graph optimality.
- Do not include Eulerian traversal, matching, flow, or cut code.

Changeset: one additive changeset.

## Wave 4: Final And Optional Layers

These tasks do not block synchronous core delivery.

### F01. Measure Effect-native candidates

Depends on B02 and finalized expensive kernels. Produce admission evidence and select one pilot; no source API.

Changeset: none.

### F02. Apply a resumable seam to one pilot kernel

Depends on F01. Add only the minimum internal state/step protocol needed by the pilot and prove synchronous multi-slice
parity and acceptable overhead.

Changeset: none.

### F03. Add one public Effect-native pilot

Depends on F02. Add the shared Effect driver and exactly one admitted variant with interruption, fairness, parity,
overhead, bundle, and circular-dependency evidence.

Changeset: one additive changeset.

Every later admitted family is a separate PR. A failed pilot is removed or deferred and does not block Graph delivery.

### D01. Publish the consolidated Graph guide

Depends on the selected release surface being frozen.

- Document only shipped APIs and measured complexity.
- Cover topology semantics, mutation, snapshots/Schema, loops/parallel edges, algorithm selection, output security,
  Effect-native behavior where shipped, and reproducible benchmark methodology.
- Keep API-specific JSDoc in the implementation PRs; this PR consolidates rather than backfills missing documentation.

Changeset: none.

## Gated Follow-Ups

The following require new approval and do not appear in active PR branches:

- Eulerian traversal, maximum flow/minimum cut, and bipartite matching.
- HITS, eigenvector, Katz, coloring, isomorphism, Louvain, and planarity.
- Traversal visits and public bidirectional Dijkstra.
- Public Watts-Strogatz and Barabasi-Albert generators.
- Emitter indentation, line separators, custom IDs, DOT attributes, and Mermaid edge IDs.
- Competitor/runtime-memory benchmark extensions and published benchmark tables.
- COW, typed heaps, or additional dense representations without measured crossover.

Rejected scope remains rejected: mixed/bidirectional graph kinds in this initiative, alternate formats, parsers, layout,
hierarchy/output groups, public kernels/caches/checkpoints, approximate TSP, and Steiner tree.

## Merge Lanes And Conflict Control

After R1, these lanes may develop concurrently:

1. Queries: Q01 -> Q02/Q03; Q04 independently.
2. Generators: G01 -> G02 -> R01 -> R02.
3. Connectivity: C01; C02 after Q01; C03 after C01; C04 after Q04; C05 after C01.
4. Paths: P01 -> P02 -> P03 -> P04 -> P05 -> P06, merged serially.
5. Analytics: A01/A02 after queries; A03 after K04; A04a/A04b after P01; A05 after P02/A04a.
6. Optimization: M01 after P01/K04.
7. Emitters: E01 -> E02/E03, independent of algorithm expansion.

Logical parallelism does not imply clean Git parallelism. `Graph.ts` and `Graph.tst.ts` remain serialization points. New
runtime tests should use family files to reduce conflicts, while each public branch rebases after the preceding merged
Graph API PR.

## Per-PR Validation

Every code PR runs:

```sh
pnpm lint-fix
pnpm --filter effect test --run test/<affected-graph-test>.ts
pnpm check
```

Add only when affected:

```sh
pnpm test-types Graph.tst.ts
pnpm lint
pnpm doctest --run packages/effect/src/Graph.ts
pnpm --filter effect test --run test/GraphProperty.test.ts
pnpm --filter effect test --run test/GraphDifferential.test.ts
pnpm --filter effect test --run test/GraphComplexity.test.ts
node --test packages/effect/runtimeperf/test/*.test.mts
pnpm runtimeperf graph/<scenario>
pnpm runtimeperf-compare graph/<scenario> --base main --head HEAD
pnpm circular
pnpm bundle-compare <base-ref>
```

Inspect `tmp/bundle-stats.txt` and report non-zero differences. Never run bare `pnpm test` or bare `pnpm doctest`.

## Changeset Policy

- Runtime behavior correction: one focused `effect` patch changeset.
- Additive public API: one changeset per independently releasable PR; patch/minor follows maintainer release policy.
- Internal refactor, tests, fixtures, benchmarks, and docs-only work: no changeset.
- Emitter hardening and emitter options never share a changeset.
- Schema release notes remain separate from Graph-domain changes.

## Recommended Starting Queue

Open only these branches initially:

1. S01 hash-law tests.
2. S04 traversal configuration.
3. S06 mutation error precedence.
4. V01 neutral corpus.
5. B01 runtimeperf generalization.
6. E01 exact emitter fixtures.

They have low semantic overlap and establish six clean review lanes. After S01 merges, begin S02; after S06 merges, begin
S07; after V01 merges, begin V02. Do not open public feature PRs before R1.
