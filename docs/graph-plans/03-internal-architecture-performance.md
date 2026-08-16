# Internal Architecture and Performance

## Status and intent

This plan owns non-breaking internal architecture and runtime performance work for `effect/Graph`. It follows the
correctness-contract and verification/benchmark foundations in the dependency order from `README.md`; it does not add
graph features or change public signatures.

The default outcome is still one public module, `effect/Graph`. Storage, iteration, queues, snapshots, and algorithm
kernels remain implementation details under `packages/effect/src/internal/graph/`. A public kernel is explicitly not part
of this program.

Implementation checkpoint after `a371754b1e`: `packages/effect/src/internal/graphCsr.ts` now provides lazy compact-node
translation, outgoing/incoming CSR, compact edge positions, and mutation invalidation. Traversal, topology, immutable
weighted paths, cycle/connectivity work, and several queues already consume it. The remaining plan must harden and measure
that architecture rather than introduce a second dense representation.

## Success criteria

- Preserve directed and undirected behavior, stable monotonic `NodeIndex` and `EdgeIndex` allocation, insertion/index
  ordering, parallel edges, self-loops, lazy walkers, errors, equality, hashing, and scoped mutation behavior.
- Replace every hot FIFO `Array.shift()` with an amortized O(1) queue without changing traversal order.
- Let algorithms consume ordered arcs without first allocating neighbor arrays or losing `EdgeIndex` identity or edge
  multiplicity.
- Remove the unconditional second full storage copy at mutation finalization; consider copy-on-write mutation startup
  only after the simpler change is measured.
- Share deterministic binary-heap machinery between weighted algorithms without making it public.
- Use sparse-to-dense translation and CSR typed arrays only where benchmarked workloads recover their construction and
  memory cost. The ordinary map/adjacency representation remains canonical.
- Make every retained cache correct for immutable and mutable graph lifecycles, including leaked finalized mutable
  handles and graphs with sparse public indexes.
- Keep all unbounded graph algorithms stack-safe.
- Require behavioral parity and paired benchmark evidence before and after each performance phase, with a local rollback
  point for every optimization.

## Non-goals

- No public representation, kernel, priority queue, snapshot, CSR, invalidation, or cache API.
- No change to `Graph`, `MutableGraph`, `Edge`, walker, path-result, constructor, or mutation signatures.
- No index reuse, implicit sorting, adjacency deduplication, or conversion of public indexes into array offsets.
- No freezing, proxies, property descriptors, or reliance on callers being unable to retain a mutable handle.
- No mixed or bidirectional edge kind, worker/Wasm kernel, automatic parallelism, or speculative algorithm-result cache.
- No Schema implementation. This plan only defines the internal snapshot/hydration seam shared with the Schema plan.
- No timing assertions in ordinary unit tests. CI-safe complexity tests may count observable callback or iterator work;
  throughput and memory gates belong in the benchmark harness.

## Current baseline

`packages/effect/src/Graph.ts` remains the public implementation module, with derived dense traversal state extracted to
`packages/effect/src/internal/graphCsr.ts`.

- Canonical state is `Map<NodeIndex, N>`, `Map<EdgeIndex, Edge<E>>`, and outgoing/incoming
  `Map<NodeIndex, Array<EdgeIndex>>` adjacency.
- Public indexes are stable monotonic identifiers and can be sparse after removals. Map iteration and adjacency-array
  order currently provide deterministic node, edge, and traversal order.
- CSR captures compact node IDs/data at iterator creation, builds directional adjacency lazily, preserves canonical row
  order, and is cached by graph shell with invalidation on public mutation. Active traversal iterators retain their prior
  snapshot while fresh iterators rebuild after mutation.
- DFS, BFS, postorder, topo, cycle/connectivity, and immutable weighted algorithms have substantial CSR migrations. BFS,
  bounded-postorder membership, topo, and immutable Bellman-Ford use head-index or typed FIFO queues.
- Two `shift()` hot loops remain in mutable `isBipartite` and mutable Bellman-Ford negative-cycle reachability. Mutable
  Bellman-Ford also retains repeated `unshift()` path reconstruction.
- Public directed neighbor queries still collect one node per parallel edge. The CSR and canonical paths agree on that
  current bug; plan 01 owns deduplication without changing multiplicity-preserving algorithm rows.
- Dijkstra and A* already use a binary min-heap with insertion sequence as a deterministic tie-breaker. Entries are
  objects and the heap helpers are embedded in `Graph.ts`.
- `beginMutation` copies both maps and every adjacency array. `endMutation` then copies the maps and every adjacency
  array again. The second copy protects the immutable result from a leaked mutable handle, while
  `Equal.byReferenceUnsafe` irreversibly gives the mutable shell reference equality.
- `acyclic` is cached in graph state and manually invalidated by structural mutations. CSR uses a separate private
  `WeakMap` cache and explicit invalidation.

The useful lessons from `.repos/graph` are its dense translation, CSR arc arrays, versioned cache tests, typed min-heap,
and deterministic performance sentinels. Its public kernel and caller-visible invalidation API are not suitable here:
Effect graph storage is opaque, and all supported structural mutation already passes through scoped APIs.

## Required semantic inventory

Before changing internals, add one table-driven parity fixture that records public results from the current
implementation for both graph kinds. It must include:

- empty, disconnected, chain, wide star, diamond, cycle, and deep-chain graphs;
- removed nodes and edges producing large gaps in otherwise small stable indexes;
- parallel edges with equal and unequal data;
- directed and undirected self-loops;
- an undirected edge inserted with either endpoint as `source`;
- multiple starts, duplicate starts, all traversal directions, finite radii, and lazy early termination;
- equal-priority shortest paths and equal-weight parallel edges;
- mutation with no writes, node-data-only writes, edge-data-only writes, structural additions/removals, `reverse`, and a
  callback that throws;
- retained mutable handles queried and used in attempted mutations after finalization;
- equality, hash, node/edge iteration, next-index allocation, and exact `GraphError` behavior.

The fixture should assert exact arrays where order is public behavior, not set equality. Oracle and property suites from
the verification plan remain authoritative for broader correctness.

## Target internal architecture

### Canonical storage

Keep maps and ordered adjacency as the canonical, mutation-friendly storage. Introduce an internal `GraphStorage<N, E>`
owned by graph shells, containing nodes, edges, both adjacency maps, next indexes, and structural metadata. Public graph
objects remain opaque shells implementing the existing protocols.

An immutable shell never mutates its storage. A mutable shell may mutate only through Graph mutation functions and has
an explicit active/finalized lifecycle. Internal ownership flags are ordinary fields; they are not enforcement through
freeze, proxy, or descriptors.

### Ordered arc kernel

Use one allocation-free callback or cursor primitive rather than generators in the hottest loops. Its conceptual record
is:

```ts
type Arc<E> = {
  readonly from: NodeIndex
  readonly to: NodeIndex
  readonly edgeIndex: EdgeIndex
  readonly edge: Edge<E>
}
```

The implementation should pass these fields as callback parameters or expose them through a reusable cursor to avoid
allocating this record. The edge envelope is internal and read-only by convention; public APIs still return fresh copies.
The cursor supports `"outgoing"`, `"incoming"`, and direction-ignored traversal.

- Directed outgoing and incoming arcs follow the corresponding adjacency list in `EdgeIndex` insertion order.
- Direction-ignored traversal over a directed graph emits outgoing arcs first, then incoming arcs, preserving
  `EdgeIndex` order within each group. It suppresses only the second occurrence of the same directed self-loop;
  reciprocal and parallel edges remain separate arcs. This preserves the ordering fixed by plan 01.
- An undirected edge contributes one oriented traversal arc at each endpoint, sharing the same `EdgeIndex`. An
  undirected self-loop emits one traversal arc. A separate incidence/degree operation counts that loop twice without
  exposing duplicate traversal or incident-edge results.
- Parallel edges remain separate arcs even when their neighbor is equal. Algorithms can therefore retain predecessor
  edge identity and multiplicity.
- Public neighbor-node queries continue to return unique node indexes. They collect from the arc kernel with first-seen
  ordering; only these public collection APIs pay for an output array and deduplication set.
- Incident-edge and algorithm kernels consume every required occurrence. No internal algorithm may call a unique-node
  helper when parallel-edge multiplicity affects degree, cycle, capacity, flow, or weighted analysis.

The callback must support early exit so `hasEdge`, point-to-point search, and lazy walkers do not scan or allocate more
than necessary.

### Dense snapshot and CSR

This section is now a hardening specification for the landed `graphCsr.ts`, not a proposal to add CSR from scratch.

Dense storage is derived and optional, never canonical. A `DenseIndex` translates stable sparse public indexes to dense
positions:

```ts
type DenseIndex = {
  readonly nodeIndexAt: ReadonlyArray<NodeIndex>
  readonly nodePosition: Map<NodeIndex, number>
  readonly edgeIndexAt: ReadonlyArray<EdgeIndex>
}
```

CSR then stores dense neighbor positions and dense edge positions in `Uint32Array`s, plus outgoing/incoming offsets.
Looking up `edgeIndexAt[denseEdge]` preserves the actual `EdgeIndex`; public indexes must never be truncated into an
`Int32Array`. Fall back to the ordered map kernel if node, edge, or arc counts cannot be represented safely in 32-bit
typed arrays.

CSR construction uses a count/prefix/fill pass over canonical edges and preserves `EdgeIndex` order within every row.
For undirected self-loops and parallel edges it must reproduce the ordered arc contract exactly. Incoming arrays are
built only for algorithms that need them, unless benchmarks show a combined snapshot is cheaper overall.

Use dense snapshots only for multi-pass or allocation-heavy algorithms after per-algorithm crossover measurements.
Single neighbor queries, small traversals, and one-pass sparse operations should stay on canonical adjacency. Do not use
a single magic node-count threshold: decisions must include arc count, required directions, number of expected passes,
and whether a compatible immutable snapshot is already cached.

### Memory model

Treat typed arrays as additional retained storage, not as a free replacement for maps. For `V` dense nodes and `A`
traversal arcs, outgoing CSR costs approximately `4 * (V + 1) + 8 * A` bytes for offsets, targets, and dense edge
positions. Retaining incoming CSR adds approximately the same amount. This excludes the comparatively expensive
`nodePosition` map, `nodeIndexAt`/`edgeIndexAt` JavaScript arrays, object headers, alignment, and construction scratch.
Invocation-local weights add `8 * E` bytes in a `Float64Array`; a typed heap also retains capacity, key, value, and stable
sequence arrays and can temporarily double those arrays while growing.

- Build only outgoing or incoming CSR when one direction is sufficient.
- Release count/cursor scratch after construction and do not retain callback-derived weights.
- Avoid caching CSR for one-shot algorithms when build cost and duplicate memory outlive the operation.
- Record canonical graph bytes and incremental snapshot bytes separately. Before each migration, state a predicted
  byte formula; unexplained measured retained memory more than 25% above that prediction is a rollback trigger.
- Prefer canonical arcs when CSR's warm speedup is small relative to its retained bytes. On memory-sensitive dense graphs,
  an invocation-local snapshot that becomes collectible after the call may be safer than a warm cache.
- COW mutation can temporarily retain source storage plus copied maps/lists; measure no-op, one-write, and bulk-write peak
  and retained memory. Do not ship COW if bulk mutation retains more than eager copying after finalization.

### Cache safety

- Cache derived structural snapshots in a module-private `WeakMap` keyed by graph shell identity. Immutable entries may
  be reused. Mutable entries are allowed only with exhaustive invalidation from every public mutation path.
- An active iterator or algorithm may retain the CSR captured at its start. Mutation invalidates the shell's cache so a
  subsequent lookup rebuilds; it must not mutate an already-issued CSR. Add direct tests for every structural and data
  mutation family and for same-walker fresh iteration.
- Finalization returns a new immutable shell, so it starts with no cache even when it adopts storage from a mutable
  shell. The finalized mutable shell remains inactive and cannot mutate through any public operation.
- `beginMutation` never mutates the source immutable storage. If copy-on-write is adopted, each map and touched
  adjacency list must be owned before its first write; untouched storage may remain shared because neither shell can
  subsequently write it.
- Keep cheap monotonic facts in mutable state only when invalidation is proven for every mutation. Otherwise move
  `acyclic` to the immutable derived-cache policy and recompute for mutable calls. Tests must cover add/remove,
  `filterMap*`, `reverse`, callback failure, and finalization.
- Do not cache weighted snapshots across calls because cost and heuristic callbacks are arbitrary and edge data may be
  reference-mutable outside Graph. Structural CSR may retain edge identity, but callback-derived weights remain
  invocation-local.
- Do not cache public arrays, mutable maps/sets, walkers, or algorithm results. Returning a cached mutable result would
  make one caller's writes observable by another.

### Mutation ownership and safe finalization

First remove only the second copy:

1. `beginMutation` creates a fresh mutable shell and the current full private storage copy.
2. `endMutation` creates a fresh immutable shell that adopts the mutable shell's storage without cloning it.
3. Before returning, mark the mutable shell finalized. Every public mutation continues to call `assertMutable`.
4. The immutable and finalized mutable shells may share storage, but neither permits further writes. Queries through the
   retained mutable handle remain allowed and observe the finalized result, matching current behavior.
5. Never return the mutable shell itself: `Equal.byReferenceUnsafe` marks that object irreversibly and would break
   structural equality/hashing after finalization.

Only after this lands and is measured should startup copy-on-write be considered. A minimal COW design copies node or
edge maps on their first data write and copies adjacency maps plus only the touched lists on structural writes. Bulk
operations may choose one full copy/rebuild when it is cheaper than many per-list copies. If ownership bookkeeping makes
common large batch mutation slower or materially increases retained memory, retain eager copying at `beginMutation`.

Exception safety remains unchanged: `mutateScoped` finalizes in `finally`, the source immutable graph is untouched, the
callback error is rethrown, and a captured mutable handle is inactive afterward.

### Queues and priority queues

- Add a tiny internal FIFO with an array and read cursor, or use local arrays with `head < queue.length` where reuse is
  unnecessary. Periodically compact only for a genuinely long-lived reusable queue; traversal-local queues are simply
  discarded. Never use `shift()` in graph kernels.
- Extract the current deterministic binary min-heap into internal graph code. Preserve insertion sequence as the
  secondary key so equal-priority Dijkstra/A* results do not reorder.
- Start with a generic array heap shared by Dijkstra, A*, and future optimization algorithms. Adopt parallel typed-array
  keys/positions only when the weighted-search benchmark shows a repeatable improvement and dense positions are already
  available. A typed heap must retain a sequence array or an equivalent stable tie rule.
- Continue duplicate pushes with stale/visited-entry skipping unless decrease-key wins benchmarks and does not alter tie
  behavior. Do not add a complex indexed heap speculatively.

### Numeric policies and path reconstruction

Own one internal edge-accessor evaluation facility with named policies for shortest-path weights, MST weights, and flow
capacities. It evaluates in stable edge-index order, retains edge identity, and lets each domain specify its accepted
number range without cloning validation loops. Also own edge-index predecessor records and shared append/reverse path
reconstruction; legacy `PathResult` and plan-05 path values are projections over that private state.

### Stack safety

All traversals, cycle detection, SCC/connectivity, path reconstruction, and future algorithms must use explicit stacks,
queues, or parent arrays. DFS frames should hold a node plus an adjacency cursor, not an allocated neighbor array.
Path reconstruction should append while following parents and reverse once, replacing repeated `unshift()`.

Parity tests must run deep directed and undirected chains of at least 100,000 nodes for representative DFS, BFS, cycle,
SCC/connectivity, topological, and path-reconstruction paths without `RangeError`. Keep these tests targeted and avoid
quadratic result materialization.

### Probes and checkpoints

Plan 02 owns the test probe vocabulary and count bounds; this plan owns zero-observable-behavior plumbing through the arc,
queue, relaxation, reconstruction, and snapshot kernels. Production wrappers pass no probe, and the probe-disabled hot
path must not branch per arc solely for testing. Prefer separate instrumented kernel entry points or a setup-time-selected
callback shape, then benchmark the ordinary path.

Also define the no-op synchronous checkpoint/step protocol required by `README.md` and plan 10. Synchronous adapters drain
the kernel without yielding. The protocol must permit a later Effect adapter to pause only at invariant-safe work-count
boundaries and resume the same private state without recomputation. Do not make every small current operation a state
machine now: establish the shared protocol and apply it only to long-running kernels as their domain plans land. No
checkpoint option is public, and hot-loop overhead above 5% is a rollback condition.

## Module organization

Split only after the internal contracts are stable; moving code and changing algorithms in the same patch obscures
regressions. The intended dependency direction is:

```text
Graph.ts (public API and JSDoc)
  -> internal/graph/model.ts       shells, protocols, storage access
  -> internal/graph/mutation.ts    ownership, adjacency maintenance, lifecycle
  -> internal/graph/arc.ts         ordered canonical arc cursor
  -> internal/graph/dense.ts       dense translation and optional CSR
  -> internal/graph/queue.ts       FIFO and deterministic min-heap
  -> internal/graph/kernel.ts      probes and resumable checkpoint protocol
  -> internal/graph/algorithms.ts  synchronous kernels, split further by domain only as needed
```

`Graph.ts` remains the sole public entry point and retains exported declarations and JSDoc. Internal modules are blocked
by the existing `./internal/*` package export rule. Avoid an internal barrel and avoid a generic graph framework: each
file should own a coherent implementation detail. If `algorithms.ts` remains large, split by traversal, connectivity,
paths, and optimization while keeping dependencies one-way through model/arc/dense/queue.

Do not hand-edit generated `packages/effect/src/index.ts`. Because no public module is added or removed, code generation
should produce no public export change.

## Benchmark foundation and gates

### Harness

Plan 02 owns the Effect-only `graph` suite in `packages/effect/runtimeperf/config.json`, its neutral corpus, and fixture
factories under `packages/effect/runtimeperf/suites/graph/fixtures/`. This program requires that foundation before source
optimization and adds cases to its shared `cases.ts`; it does not create another fixture or timing system. Runtimeperf is
preferred over ad hoc Tinybench scripts because it runs fresh Node processes, alternates base/head order, calibrates
batches independently, and uses paired bootstrap classification. Each fixture validates its result before and after
measurement.

Add cases for:

- full and early-abandoned BFS/DFS on chain, wide, and sparse-index graphs;
- direction-ignored traversal and public neighbors on directed/undirected multigraphs;
- `isAcyclic`, SCC/connectivity, and `topo` on deep and wide graphs;
- Dijkstra and A* on sparse and dense weighted graphs with equal-priority ties;
- Bellman-Ford negative-cycle reachability;
- no-op, one-write, and 10,000-write `mutate`, with separate construction and finalization cases where possible;
- cold dense-snapshot construction, warm immutable CSR reuse, and mutable invocation-local construction;
- canonical arc scans versus CSR scans at small, medium, and large node/edge densities.

Use plan 02's fixed seeded fixtures. Keep setup outside `run`, except explicitly named cold/build cases.
Return a checksum that includes visited node order, selected `EdgeIndex` values, and distances so dead-code elimination or
semantic drift cannot masquerade as speedup.

An optional `packages/effect/benchmark/graph/core.ts` may consume the same fixtures for local profiling only; it is not a
merge gate. Use plan 02's opt-in fresh-process `--expose-gc` memory mode for canonical-only, cold CSR, warm CSR, mutation
start, and mutation end. Record medians and MAD from at least five processes, including `heapUsed`, `external`, and
`arrayBuffers`; do not assert machine-specific absolute bytes in Vitest or advertise a memory command until plan 02 has
defined its selector.

### Gate policy

Land the fixtures before source optimization so every phase compares against a parent containing the same fixtures. For
each phase:

1. Run the targeted parity tests and graph benchmark against the unmodified phase parent and archive the JSON report.
2. Make one architectural/performance change, rerun the same selected cases with the same settings, and inspect raw
   process measurements as well as classification.
3. Require no statistically classified regression over 5% in any affected or control case. A deliberate tradeoff may be
   accepted only when the plan names it in advance, the target case improves at least 10%, and the aggregate workload and
   memory evidence justify it.
4. Require the phase's claimed hot case to improve at least 10% or remove the extra machinery. For queue replacement on
   wide/deep BFS and elimination of repeated neighbor allocation, target at least 20% at the largest fixture.
5. Reject a dense/CSR phase if its cold case regresses by more than 10%, if its measured crossover does not occur in the
   supported fixture range, or if retained memory exceeds the documented budget without a compensating target win.
6. Run a second comparison with more rounds for results whose confidence interval crosses either threshold. Never tune a
   threshold to make one noisy run pass.

Exact paired commands after the graph suite exists:

```sh
pnpm runtimeperf graph
pnpm runtimeperf-compare graph --base HEAD --head worktree --rounds 9 --time 500 --warmup-time 150
pnpm runtimeperf-compare graph --base HEAD --head worktree --rounds 9 --time 500 --warmup-time 150 --fail-on-regression
```

For a committed phase, replace `--base HEAD --head worktree` with the phase's parent and commit SHA. Save the generated
report path from `tmp/runtimeperf/results/` in the PR notes. Run the memory command defined by the new diagnostic in five
fresh processes and include its median table; the implementing PR must document the exact command in that script's
README/output.

## Phased implementation

### Phase 0: contracts and measurements

Depends on the correctness-contract and verification/benchmark foundation plans. It can proceed independently of new
algorithms and Schema serialization.

- Add exact-order parity fixtures, multigraph/self-loop cases, retained-handle lifecycle cases, and 100,000-node stack
  tests through plan 02's shared corpus and test layout.
- Ensure plan 02's runtimeperf graph suite and memory mode contain the cases described above.
- Capture baseline reports before touching implementation.

Gate: all existing Graph tests and new parity tests pass; every fixture validates; repeated baseline runs have stable
enough variance to classify a 10% change. Roll back or resize a fixture if calibration is dominated by setup, GC, or
sub-timer operations.

### Phase 1: FIFO and reconstruction linearity

Depends only on Phase 0.

- Most traversal/topology and immutable-path replacements landed in `a371754b1e`. Replace the remaining mutable
  `isBipartite` and mutable Bellman-Ford `shift()` queues while preserving enqueue order.
- Replace the remaining mutable Bellman-Ford path `unshift()` loop with append-and-reverse.
- Do not change adjacency access or storage in this phase.

Gate: exact BFS/topological/path parity and lazy early-termination tests pass; largest BFS improves at least 20%; no
control regresses over 5%. Roll back an individual replacement if ordering changes or the target does not improve.

### Phase 2: ordered arc cursor and allocation removal

Depends on Phase 1 and the shared ordered-arc concept in `README.md`.

- Treat the landed CSR rows as the current dense arc kernel and add a canonical-storage cursor only where benchmarks show
  CSR construction is not justified. Do not create another dense representation.
- Complete migrations family by family and keep public neighbor collectors as compatibility adapters.
- Add compact-edge-position to stable public `EdgeIndex` projection. Immutable weighted algorithms currently retain only
  compact edge positions, while mutable paths still retain edge data; neither satisfies the shared edge-identity contract.
- Delete old array-producing internal neighbor helpers only after every consumer is classified as unique-node or
  occurrence-preserving.

Gate after each algorithm family: exact output parity, directed/undirected self-loop and parallel-edge tests, differential
tests, stack tests, and selected runtimeperf cases. Require the largest allocation-heavy traversal to improve at least
20%. Roll back only that family to the compatibility adapter if ordering, multiplicity, or performance fails.

### Phase 3: mutation finalization ownership

Depends on Phase 0; it can be developed in parallel with Phases 1-2 but should land separately.

- Introduce graph shells/storage if needed and let a new immutable shell adopt finalized mutable storage.
- Preserve irreversible reference equality only on the mutable shell.
- Test no-op, successful, throwing, and retained-handle cases, including equality/hash before and after finalization.
- Measure constructor mutation and `mutate` separately from algorithm work.

Gate: end-mutation time and peak allocation for a 10,000-node/30,000-edge graph improve materially, with a target of at
least 30%; begin-mutation and batch-write controls do not regress over 5%. Roll back to copy-on-finalize if any public path
can mutate adopted storage or if memory is retained unexpectedly.

### Phase 4: optional mutation copy-on-write

Depends on Phase 3 and is conditional, not presumed necessary.

- Prototype map-level and touched-adjacency-list ownership only if no-op and small-write mutation startup remains a
  measured bottleneck.
- Add bulk-copy/rebuild escape paths for large removals, filtering, and reverse.
- Keep eager begin-copy as the fallback implementation until all mutation shapes pass.

Gate: no-op and one-write cases improve at least 20%, 10,000-write and bulk-transform cases regress no more than 5%, and
retained memory does not exceed eager copy. Otherwise do not ship COW; Phase 3 alone is the safe simpler result.

### Phase 5: shared deterministic priority queue

Depends on Phase 2 so entries can retain dense/public node and edge identity cleanly.

- Extract the current stable heap and share it across Dijkstra/A* and later weighted algorithms.
- Defer object-entry versus parallel-typed-array comparison to Phase 6, when dense translation exists. Preserve
  equal-priority sequence ordering and duplicate-entry semantics.

Gate: equal-cost path parity and weighted oracle tests pass. Extraction alone may be performance-neutral. The Phase 6
typed-heap experiment ships only with at least a 10% large-graph weighted-search win and no small-graph regression over
5%; otherwise retain the generic internal heap.

### Phase 6: dense translation and CSR

Depends on Phases 2 and 5 plus actual consumers from later algorithm plans. It must not block simple query/traversal work.

- Audit and benchmark the landed sparse-to-dense translation, ordered outgoing/incoming CSR, and lazy edge projections.
- Compare the current cached implementation with canonical and invocation-local alternatives per algorithm.
- Retain mutable caching only if invalidation tests and cold/warm/memory measurements justify it.
- Compare the generic heap with a dense typed heap here; retain the generic heap unless the weighted-search gate passes.
- Migrate only algorithms with repeated adjacency passes or proven map/set overhead. Keep the canonical kernel beside
  each migration as a small-graph/unsupported-size fallback and differential reference.

Gate: bit-for-bit public parity, sparse-index and max-safe-public-index tests, CSR order/multiplicity tests, mutable cache
safety tests, and cold/warm/memory benchmarks. Roll back each algorithm independently if no useful crossover exists.
Remove CSR entirely if no planned algorithm benefits enough to justify duplicate memory.

### Phase 7: cache hardening and module split

Depends on stable storage, arc, mutation, and dense contracts from prior phases.

- Move `acyclic` and structural snapshots under the documented immutable/mutable cache policy.
- Add tests that count snapshot builds internally in a test-only manner: immutable warm reuse, distinct graph isolation,
  no mutable reuse, mutation finalization, removal gaps, and garbage-collectable ownership where practical.
- Extract internal modules without behavior changes, then run circular-dependency and bundle checks.

Gate: no public API or generated-index diff, no new import cycle, identical parity output, and no benchmark regression over
5%. If extraction introduces a cycle or measurable module-load/bundle cost, keep the affected code in the nearest deeper
module rather than adding a barrel or indirection.

## Schema snapshot/hydration coordination

The Schema plan owns the encoded shape, validation, public constructors/codecs, and error mapping. Its encoded shape is
exactly `type`, ordered indexed node entries, and ordered indexed edge entries; it has no wire `version`,
`nextNodeIndex`, or `nextEdgeIndex`. This plan owns only the internal trusted seam that avoids rebuilding adjacency
through repeated public mutations after Schema has validated input.

The shared internal snapshot uses that same minimal shape. Hydration must validate or receive proof of these invariants:

- indexes are finite safe non-negative integers and unique;
- every edge endpoint exists;
- node and edge entry order is canonical index/insertion order required by Graph behavior;
- graph kind is directed or undirected.

Hydration derives `nextNodeIndex` and `nextEdgeIndex` as one greater than the highest active index, or zero for an empty
collection. This intentionally does not preserve trailing removed indexes across serialization. Internal in-memory graph
storage and selection snapshots may retain allocator counters where an operation must preserve future allocation exactly,
but those counters are not part of the Schema snapshot or encoded form.

Hydration builds canonical adjacency in one pass and returns a fresh immutable shell with empty derived caches. It must
not accept or serialize adjacency, CSR arrays, cache state, ownership flags, mutable state, or `acyclic`; those are
recomputed internals. The trusted hydrator remains internal and is called only after Schema validation. Public
`Graph.Snapshot`, `Graph.fromSnapshot`, and `Schema.Graph` landed separately in `189b003a23`; this plan owns only derived
storage and cache coordination.

If the Schema plan lands first, it may temporarily hydrate through public mutation. It must not invent a second internal
representation; switch to this shared seam once available and retain round-trip tests for sparse active indexes,
parallel edges, self-loops, equality, and allocator high-water derivation from active indexes.

## Public-kernel decision

Default decision: expose no public kernel. Opaque storage lets Effect change queues, ownership, CSR layout, cache policy,
and algorithm selection without a semver contract, and the public `Graph` functions already cover supported use cases.

Reconsider only in a separate public API proposal when all of the following are true:

- at least two concrete external algorithm packages need zero-allocation arc access and cannot meet requirements through
  existing APIs;
- the ordered arc and snapshot contracts have survived at least two internal algorithm families without revision;
- maintainers are willing to support index/multiplicity/order and invalidation semantics as public compatibility;
- benchmarks show a material benefit that cannot be delivered internally or through existing lazy walkers;
- the API can avoid exposing storage, mutable cache invalidation, typed-array layout, or ownership details.

Even then, prefer a narrow read-only arc visitor over exposing maps, CSR, hydration, or caches. Absence of these criteria
closes the question; internal test convenience is not justification for public API.

## Dependencies and ownership

- Requires the correctness-contract plan for exact self-loop, multiplicity, ordering, errors, and safe-lookup semantics.
- Requires the verification/benchmark foundation plan for seeded fixtures and oracle adapters; this plan extends the
  runtimeperf registry with graph-specific cases.
- Owns canonical storage shells, ordered arc iteration, queue/heap internals, dense translation/CSR, named numeric
  policies, edge-index path reconstruction, structural cache policy, mutation copy strategy, and internal module
  boundaries.
- Core-query, traversal/path, connectivity/DAG, optimization, and analytics plans consume the ordered arc and optional
  dense kernels. They must not create competing adjacency or dense representations.
- Owns the no-op checkpoint/step protocol and synchronous driver seam. The Effect-native interruption plan owns
  Effect-returning adapters and applies the seam only after synchronous loop and ordering contracts stabilize.
- The Schema plan owns all serialization API and validation, coordinating only through the internal trusted
  snapshot/hydration seam above.

## Exact validation for implementing PRs

Run the narrow commands after every phase, never the whole test suite:

```sh
pnpm lint-fix
pnpm --filter effect test --run test/Graph.test.ts
pnpm --filter effect test --run test/GraphProperty.test.ts
pnpm --filter effect test --run test/GraphDifferential.test.ts
pnpm --filter effect test --run test/GraphComplexity.test.ts
node --test packages/effect/runtimeperf/test/*.test.mts
pnpm check
pnpm runtimeperf graph
pnpm runtimeperf-compare graph --base HEAD --head worktree --rounds 9 --time 500 --warmup-time 150 --fail-on-regression
```

For the module-splitting phase also run `pnpm circular`. For a committed module-splitting phase use:

```sh
pnpm bundle-compare HEAD~1
```

Review `tmp/bundle-stats.txt` and require no unexpected public `effect/Graph` increase. Once plan 02 defines its exact
memory selector, run it in at least five fresh `node --expose-gc` workers and report median/MAD `heapUsed`, `external`, and
`arrayBuffers` deltas. Until then, memory evidence is required for CSR and mutation ownership but is not represented by a
made-up command.

If a phase adds or changes type-level API despite this plan's non-breaking constraint, stop and resolve the scope rather
than silently adding a type test or changeset. Internal-only refactors need no changeset; any observable runtime behavior
or exported API change requires reassessment under the relevant domain plan.

## Completion checklist

- No graph hot loop uses `Array.shift()` or recursive descent.
- Internal algorithms do not allocate neighbor arrays unless producing a public array result.
- Arc traversal retains stable `EdgeIndex`, parallel-edge multiplicity, self-loop semantics, and deterministic order.
- Immutable caches are safe and weakly held; mutable calls cannot observe stale snapshots.
- Mutation no longer performs an unconditional begin/end double copy; any COW complexity has benchmark justification.
- Dense/CSR and typed heaps exist only where crossover, warm reuse, and memory measurements justify them.
- `effect/Graph` remains the only public module and no kernel is exported.
- Schema hydration shares canonical snapshot invariants without serializing implementation state.
- Every landed phase has parity results, paired benchmark reports, memory evidence where relevant, and a documented local
  rollback decision.
