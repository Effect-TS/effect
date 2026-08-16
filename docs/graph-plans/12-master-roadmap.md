# Graph Master Roadmap

## Authority and status

This roadmap is the binding coordination document for plans 01-11. Domain plans remain the detailed implementation
specifications; when wording conflicts, this roadmap wins. Public names and release levels marked for maintainer approval
are not commitments until approved.

### Implementation checkpoint: 2026-08-16

The delivery-status column below records roadmap disposition, not implementation completion. Current source includes
`Schema.Graph` / `Graph.fromSnapshot` (`189b003a23`) and a broad CSR traversal optimization (`a371754b1e`). The latter
implemented iterator-time CSR snapshots, mutation invalidation, stack-safe DFS/BFS/postorder, typed/head-index queues in
major traversal paths, and partial compact-edge predecessor state. Still open are radius validation, defensive `start`
copying, DFS first-root priority, directed-neighbor deduplication, the last mutable `shift`/`unshift` loops, stable public
`EdgeIndex` reconstruction, and all public plan-05 `Path` APIs.

The operational PR order and current port inventory are maintained in the
[current execution plan](./13-current-execution-plan.md). The concrete pull-request split and merge lanes are maintained
in the [PR delivery plan](./14-pr-delivery-plan.md).

The current baseline is `packages/effect/src/Graph.ts`: it owns automatic numeric identifiers, the legacy three-field
`PathResult`, algorithms, walkers, and the `toGraphViz` / `toMermaid` emitters. Derived dense traversal state lives in
`packages/effect/src/internal/graphCsr.ts`; Schema snapshot coordination lives in `packages/effect/src/Schema.ts` and
`packages/effect/src/internal/graph.ts`.

Detailed contracts live in [plan 01's Desired contracts](./01-correctness-contracts.md#desired-contracts),
[plan 02's Shared Seeded Fixtures](./02-verification-benchmarks.md#shared-seeded-fixtures),
[plan 03's Target internal architecture](./03-internal-architecture-performance.md#target-internal-architecture), and
each domain plan's Dependencies and Ownership section. Reference code is evidence, not API authority: relevant starting
points include `.repos/graph/src/queries.ts`, `.repos/graph/src/algorithms/paths.ts`,
`.repos/graph/src/algorithms/traversal.ts`, `.repos/graph/src/generators.ts`, and `.repos/graph/bench/compare/`.

## Binding scope and semantics

- Preserve every existing public signature and valid runtime shape. Correct behavior only where plan 01 has a focused
  regression test; all new capability is additive.
- Support only uniformly `"directed"` and `"undirected"` graphs. Do not add mixed/bidirectional edge kinds.
- Keep automatic monotonic numeric `NodeIndex` and `EdgeIndex`; no caller-supplied IDs, reuse, or public dense positions.
- Equality and hashing compare active indexed structure and payloads, not allocator history. `MAX_SAFE_INTEGER` is a valid
  final allocated index; subsequent allocation fails atomically with `GraphError`.
- Preserve stable index/insertion order, sparse active indexes, parallel edges, self-loops, scoped mutation, and shallow
  copied public edge envelopes. Do not use freeze, proxies, or property descriptors.
- Neighbor-node queries are unique. Incident/algorithm arc queries preserve edge occurrences. Directed loops contribute
  one in and one out incidence; undirected loops contribute degree two but one logical edge.
- Existing synchronous APIs stay synchronous. Effect variants are additive, benchmark-admitted, and use internal
  resumable checkpoints only. No public checkpoint, progress callback, or `AbortSignal` leaks kernel mechanics.
- Weighted algorithms on mutable inputs use one structural snapshot for an in-flight call; callback mutation affects
  later calls. Payloads remain shallow references.
- `PathResult<E>` remains exactly `{ path, distance, costs }`. Plan 05 owns additive `Path` / `WeightedPath` values;
  existing shortest-path overloads do not gain `includeEdges` or optional edge fields.
- Plan 04's `isConnected` is undirected-only. Plan 06 owns directed-only `isWeaklyConnected` and
  `isStronglyConnected`; no directed `isConnected` alias or overlapping overload is allowed.
- Output is DOT and Mermaid only. No layout, rendering, hierarchy, custom formatter/plugin, parser, or plain JSON graph
  API. Emitter tests use exact strings without parser dependencies. Output groups are deferred as hierarchy-like scope;
  Mermaid edge IDs remain separately gated.
- `Schema.Graph` is separate. Its encoded/internal Schema snapshot contains only `type`, indexed nodes, and indexed
  edges. It has no wire `version`, `nextNodeIndex`, or `nextEdgeIndex`; decode derives each allocator high-water mark as
  `max(active index) + 1`, zero, or an internal exhausted state after `MAX_SAFE_INTEGER`. In-memory operation snapshots
  may retain allocators when exact future allocation must survive a transform, but that state never enters the Schema encoding.
- Every plan consumes plan 02's neutral fixture corpus and adapters and plan 03's ordered-arc, dense snapshot, numeric
  policy, predecessor/path reconstruction, and checkpoint kernels. No domain-local replacement is allowed.

See also [plan 05's Public Models](./05-traversal-paths.md#public-models),
[plan 10's Decisions](./10-effect-native-interruption.md#decisions), and
[plan 11's Explicit Non-Goals](./11-dot-mermaid-documentation.md#explicit-non-goals).

## Plan index

| Plan | Owner | Roadmap disposition |
| --- | --- | --- |
| [01](./01-correctness-contracts.md) | Existing API contracts and regression fixes | Committed foundation |
| [02](./02-verification-benchmarks.md) | Neutral fixtures, properties, oracles, probes, runtimeperf | Committed foundation |
| [03](./03-internal-architecture-performance.md) | Shared private kernels and measured internal optimization | CSR substantially landed; hardening/measurement and remaining kernels committed; COW gated |
| [04](./04-core-queries-transforms.md) | Core queries, undirected predicates, subgraphs | Committed additive core, names subject to API review |
| [05](./05-traversal-paths.md) | Public edge-aware paths and enumeration | `Path` foundation approved but not implemented; enumeration/visits/bidirectional work gated |
| [06](./06-connectivity-dag-algorithms.md) | Explicit connectivity, cuts, condensation, DAG analyses | Committed structural set; expensive reduction/dominance land separately |
| [07](./07-optimization-algorithms.md) | MST, Euler, matching, flow/cut | MST/forest active after prerequisites; all other families parked |
| [08](./08-analytics.md) | Centrality, PageRank, core decomposition | Adopted set committed after kernels; all “Later” entries remain gated |
| [09](./09-generators.md) | Public standard/random constructors | Committed small set after plan 02; network models deferred |
| [10](./10-effect-native-interruption.md) | Effect drivers and admitted Effect variants | Last, benchmark-gated |
| [11](./11-dot-mermaid-documentation.md) | Emitter hardening and consolidated guide | Hardening/docs committed; additive options individually gated |

## Public API ownership

| Public surface | Sole owner | Binding disposition |
| --- | --- | --- |
| Existing constructors, mutation, walkers, neighbors, algorithms, `PathResult`, emitters | Plan 01 contracts; original implementation remains | Non-breaking; regression fixes only |
| Incident/in/out edges, edges-between, degree variants, `hasPath`, undirected `isConnected`/`isTree`, induced subgraphs | Plan 04 | Additive committed set; explicit edge-selected subgraphs remain internal |
| `Path`, `WeightedPath`, path utilities, tied/simple/alternative paths, cycles, optional visits | Plan 05 | Path model/utilities first; enumerators and visits require per-group API gate |
| Directed weak/strong connectivity, cuts, biconnected blocks, condensation, transitive reduction, dominators | Plan 06 | Explicit names only; no plan-04 aliases |
| Spanning forest/tree | Plan 07 | Active after shared edge identity, numeric policy, verification, and API review |
| Euler trails, matching, flow/cut | Plan 07 | Parked; require a new demand decision and one review/changeset per family |
| Degree/closeness/betweenness centrality, PageRank, core numbers/k-core | Plan 08 | Adopted analytics set; stage independently |
| HITS/eigenvector/Katz, coloring, isomorphism, Louvain, planarity | Plan 08 | Deferred; reserve no exports |
| Complete/path/cycle/grid/tree and Effect-random graph constructors | Plan 09 | Small committed constructor set; automatic IDs only |
| Effect-suffixed variants | Plan 10 | Only for benchmark-admitted finalized sync APIs |
| DOT/Mermaid option additions and Graph guide | Plan 11 | No new format; groups deferred |
| `Schema.Graph` codec and `EncodedGraph` | Separate Schema work | Exact minimal encoded shape; not owned by this roadmap |

## Internal helper ownership

| Helper/kernel | Owner | Consumers |
| --- | --- | --- |
| Neutral `GraphSpec`, seeded PRNG, fixtures, fingerprints, oracle/runtimeperf adapters | Plan 02 | Every plan |
| Probe vocabulary and deterministic bounds | Plan 02 | Plans 03-10 |
| Canonical storage/lifecycle and ordered outgoing/incoming/direction-ignored arc cursor | Plan 03 | Plans 01 and 04-10 |
| Sparse-to-dense translation, optional CSR/bitsets, queue, stable heap | Plan 03 | Plans 05-10 when measured |
| Numeric accessor evaluation and named weight/capacity policies | Plan 03 | Plans 01, 05, 07, 08 |
| Edge-index predecessor records and shared path reconstruction/projection | Plan 03 | Existing paths and plan 05; plan 01 tests compatibility |
| No-op checkpoint, resumable step protocol, synchronous driver, test probe seam | Plan 03 | Domain kernels; plan 10 supplies Effect driver |
| Selected-structure copier preserving active indexes and in-memory allocators | Plan 03 | Plans 04 and 06; distinct from Schema snapshot |
| Internal Schema snapshot/hydrator registration | Separate Schema work with plan 03 seam | Schema only; derives allocators from active indexes |
| Algorithm-specific state (low-link, flow residuals, analytics scratch, generators) | Owning domain plan | Must build on plan 03, not fork it |

## Dependency DAG

```text
01 contracts
  -> 02 fixtures/oracles/benchmarks
      -> 03 shared kernels
          -> 04 core queries/transforms
          -> 05 path model and traversal/path kernels
              -> 06 connectivity/DAG (also depends on 04)
                  -> 07 optimization (also depends on 05)
                  -> 08 analytics (also depends on 05)
          -> 09 public generators (fixture ownership remains in 02)

03 + finalized admitted domain kernels -> 10 Effect-native interruption
01 + 02 -> 11 emitter hardening
final implemented surface + separate Schema.Graph -> 11 consolidated guide
```

Plan 11 emitter hardening may run after plans 01-02 without waiting for algorithms. Schema work may land independently
through the existing seam. Plan 06 cycle enumeration dependency points to plan 05; plan 05 may consume plan 06 SCC only
as an optimization, never as a correctness cycle.

## Implementation waves

Each slice is one reviewable PR unless it is tests/docs-only and naturally smaller.

| Wave | PR-sized slice | Exit |
| --- | --- | --- |
| 0 | Plan 01 contract regressions and exact legacy path/emitter baselines | Targeted runtime/type tests pin compatibility |
| 1A | Plan 02 neutral corpus + Effect adapter + fingerprints | Identical seed/spec replay; rich/simple domains explicit |
| 1B | Property/differential tests and deterministic complexity probes | Hand oracle checks precede seeded comparisons |
| 1C | Runtimeperf Graph registry and validated baseline cases | Reproducible base/head artifact; no timing CI gate |
| 2A | Finish Plan 03 FIFO/reconstruction linearity after the landed traversal rewrite | No remaining `shift`/`unshift` hot loops; exact output parity and stack tests |
| 2B | Harden landed CSR/ordered arcs; complete stable predecessor edge identity and numeric policies | No duplicate arc/path/weight helper remains |
| 2C | Mutation finalization ownership and module seams | Retained handles safe; no public diff |
| 2D | Dense/CSR, typed heap, or COW one experiment at a time | Ship only at each plan-03 benchmark/memory crossover |
| 3A | Plan 04 local edge/degree queries and boundary walkers | Multigraph/mutable/type contracts pass |
| 3B | Plan 04 subgraphs and structural predicates | Active indexes and in-memory allocators preserved |
| 4A | Plan 05 `Path`/`WeightedPath`, utilities, internal legacy projection | Existing `PathResult` objects remain exact |
| 4B | One path enumeration family per PR | Laziness and bounded small-graph oracle pass |
| 5A | Plan 06 explicit connectivity and low-link cuts | No overlap with plan 04; iterative/edge-aware |
| 5B | Condensation, transitive reduction, and dominators separately | Reachability/order/stack and memory gates pass |
| 6A | Plan 09 deterministic constructors | Formulas, ordering, automatic IDs, validation pass |
| 6B | Plan 09 Effect-random constructors | Seeded `Random` tests and neutral-spec adaptation pass |
| 7A | Plan 08 degree/core analytics | Linear scaling and oracle pass |
| 7B | Closeness/betweenness, then PageRank in separate PRs | Numeric/convergence/oracle/bundle gates pass |
| 8 | Each approved plan-07 optimization family independently | Demand, API, oracle, bundle, benchmark gate per family |
| 9A | Plan 11 emitter exact fixtures and injection hardening | Default compatibility except demonstrated fixes |
| 9B | Approved emitter options, then consolidated guide | DOT/Mermaid only; no hierarchy/layout/custom format |
| 10 | Plan 10 driver, one pilot, then admitted Effect families | Multi-slice parity, interruption, fairness, overhead pass |

## Gating and exit criteria

- A wave cannot consume an unlanded helper by cloning it locally. It waits, or lands the minimal helper in the owning
  plan first.
- Additive APIs require approved names, complete JSDoc/type/runtime tests, and a focused changeset. “Optional,” “Later,”
  and prototype sections are not implementation authorization.
- Existing behavior changes require a plan-01 regression proving a contract bug and a compatibility note.
- Dense/CSR, COW, typed heaps, bidirectional Dijkstra, specialist algorithms, and Effect variants ship only when their
  plan's benchmark, memory, parity, and bundle gates pass. Failed experiments are removed, not retained dormant.
- Lazy APIs must prove zero/one/`k` consumption does not materialize all results. Every unbounded kernel is stack-safe.
- Cross-library oracles are admitted only after hand-checked semantic equivalence; Effect multigraph identity/order
  remains locally asserted.
- Completion means no competing fixture, arc, dense, numeric, reconstruction, checkpoint, connectivity alias, or wire
  representation exists.

## Changeset strategy

- Tests, benchmarks, internal refactors, and docs-only changes need no changeset.
- Contract bug fixes that alter runtime behavior use a focused `effect` patch changeset and call out compatibility.
- Additive public API groups receive one changeset per independently releasable PR. Keep them separate from bug fixes.
- Emitter escaping fixes and emitter options use separate changesets.
- The exact patch/minor level for additive APIs during the current release line requires maintainer approval; domain-plan
  references to patch or minor are provisional. Never combine deferred/rejected names into release notes.
- `Schema.Graph` changesets belong to the separate Schema implementation, not these graph-domain PRs.

## Validation matrix

| Change | Required validation |
| --- | --- |
| Documentation plans only | `pnpm lint-fix`; `git diff --check` |
| Graph runtime code | `pnpm lint-fix`; targeted `pnpm --filter effect test --run test/<file>`; `pnpm check` |
| Public types/API | Runtime checks above; `pnpm test-types Graph.tst.ts` |
| Graph JSDoc examples | `pnpm lint`; `pnpm doctest --run packages/effect/src/Graph.ts` |
| Schema coordination code | Targeted `test/schema/Graph.test.ts`; Schema type tests as applicable; `pnpm check` |
| Property/differential/complexity | Only the affected `GraphProperty`, `GraphDifferential`, or `GraphComplexity` file |
| Runtimeperf infrastructure | Targeted runtimeperf node tests plus selected validated Graph scenarios |
| Performance-sensitive kernel | Same seeded base/head runtimeperf cases; memory mode where required; no wall-clock unit gate |
| Module split/bundle-sensitive API | `pnpm circular`; `pnpm bundle-compare <base-ref>` and inspect `tmp/bundle-stats.txt` |

Never run bare `pnpm test` or bare `pnpm doctest`.

## Deferred and rejected

Deferred pending a separate gate: traversal visits, all-pairs edge-aware output, bidirectional Dijkstra, COW/CSR/typed
heap experiments without measured crossover, plan-07 Euler/matching/flow families, Watts-Strogatz and Barabasi-Albert public
generators, Mermaid edge IDs, and all plan-08 “Later” analytics (HITS, eigenvector, Katz, greedy coloring, isomorphism,
Louvain, boolean planarity).

Rejected for this initiative: mixed/bidirectional edge kinds, caller IDs, index reuse, freeze/proxy/descriptors, public
kernel/CSR/cache APIs, public checkpoints/progress/AbortSignal, alternate fixture systems, Schema wire version/allocator
state, plain JSON graph models, layouts/rendering, custom formats/plugins, hierarchy/output groups, DOT/Mermaid parsers,
strict DOT, label propagation, Girvan-Newman, naive greedy modularity, approximate TSP, and Steiner tree. See plan 08's
Portfolio Decision and Explicit Rejections, plan 09's Non-Goals, and plan 11's Explicit Non-Goals.

## Maintainer approval required

- Final names and grouping for every new public API, especially plan 04 queries, plan 05 path models/enumerators, and
  plan 06 result models.
- Whether additive exports use patch or minor changesets on the active release line.
- Final MST/forest public names and bundle budget. Other plan-07 families require a new demand decision before API review.
- Whether adopted plan-08 analytics should all live in `effect/Graph` or a future opt-in surface.
- Which plan-10 candidates cross the admission threshold after final synchronous benchmarks.
- Which plan-11 additive identifier/attribute options are worth their security and compatibility surface; output groups
  are not included in this decision because they are deferred by binding scope.
- The final Graph guide location and benchmark-publication policy.
