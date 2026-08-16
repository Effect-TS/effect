# Correctness Contracts and Semantic Hardening

## Status and scope

This is the first dependency in the graph improvement sequence. It defines and tests the observable contracts that
later query, traversal, path, optimization, serialization, and performance plans must preserve. It does not propose a
new graph kind, change stable numeric indexes, remove parallel edges or self-loops, or make synchronous APIs effectful.

Assumptions:

- The shared semantics in [`README.md`](./README.md#shared-semantics) are normative where the current implementation or
  tests disagree.
- Existing public signatures and default ordering remain intact. A behavior change is allowed only when a regression
  test demonstrates a violation of those shared semantics or a standard `Equal` / `Hash` law.
- `Edge<E>` is a shallow value envelope. The graph owns `source` and `target`, but does not deep-clone or freeze user
  payload `E`.
- This plan owns contract decisions and focused regression fixes. Later plans own reusable arc/snapshot kernels and new
  algorithm families.

Implementation checkpoint after `a371754b1e` (Optimize graph traversal): traversal now uses an internal CSR snapshot per
iterator, DFS/BFS use explicit stacks or typed FIFO storage, and active iterators are isolated from later mutations. Those
behaviors are no longer open correctness questions. Invalid radius values, caller-owned `start` arrays, DFS multi-root
priority, and directed neighbor duplication remain open.

## Current gaps

### Traversal radius

`SearchConfig.radius` and `NeighborhoodConfig.radius` accept any `number`, with no stated domain beyond being an edge
distance (`Graph.ts:1272-1281`, `Graph.ts:5785-5789`). DFS and BFS compare integer depths directly with the supplied
value (`Graph.ts:5838-5969`, `Graph.ts:6018-6125`), so `NaN`, negative values, and fractions silently acquire accidental
semantics. For example, a negative or `NaN` radius yields start nodes only, while `1.5` reaches depth two. Postorder and
`neighborhood` inherit those semantics (`Graph.ts:1332-1336`, `Graph.ts:6339-6395`). Existing tests cover only valid
integer boundaries (`Graph.test.ts:696-742`, `Graph.test.ts:4261-4342`, `Graph.test.ts:4561-4574`).

The CSR traversal rewrite did not add radius validation. DFS, BFS, bounded postorder membership, and `neighborhood`
still compare integer depths to the supplied number, so this gap remains after `a371754b1e`.

### Traversal snapshots, configuration ownership, and root order

Traversal construction is lazy. Each fresh iterator now captures a CSR snapshot of node identity, node data, and the
required adjacency, so mutations after iteration starts do not affect that active iterator; a later iterator observes the
new graph state. DFS and BFS advance incrementally. Finite-radius postorder intentionally computes its complete bounded
membership set when the iterator is created before yielding postorder results. This exception is documented and is not a
remaining correctness defect.

Two contracts remain unresolved:

- `config.start` is retained by reference but validated only when the walker is created. Later caller mutation can change
  future iterations or insert an unvalidated missing node into compact-index lookup.
- BFS and postorder prioritize multiple roots in supplied order, while DFS currently pushes roots onto a LIFO stack in
  supplied order and therefore prioritizes the last root. Duplicate-root and exact multi-root DFS ordering are not pinned.

The implementation and tests now establish snapshot isolation for active traversal. They do not need a blanket
"mutation during active iteration is unsupported" rule for DFS, BFS, postorder, or topo.

### Neighbor multiplicity and ordering

The shared contract says neighbor-node queries are unique. Undirected neighbors already use a `Set` and preserve first
incident-edge order (`Graph.ts:3800-3821`), including one occurrence for a self-loop. Directed neighbors append one node
per edge in both canonical and CSR-backed paths (`Graph.ts:2570-2605`), so parallel directed edges duplicate `neighbors`, `successors`, `predecessors`, and the
deprecated `neighborsDirected`. Tests demonstrate undirected deduplication but do not exercise directed parallel edges
or directed self-loops (`Graph.test.ts:2238-2308`). Direction-ignored traversal unions outgoing then incoming neighbors
(`Graph.ts:3823-3839`), but its ordering and deduplication are not pinned for reciprocal edges or self-loops.

Changing directed neighbor output from one item per edge to one item per node is compatibility-sensitive for callers
that accidentally use these arrays as degree counts. It is nevertheless a bug fix under the shared semantics. Degree
and incident-edge APIs must preserve multiplicity independently; later implementations must not derive degree from a
deduplicated neighbor list. `.repos/graph` makes the same separation by deduplicating node queries
(`.repos/graph/src/queries.ts:177-280`) while retaining edge-list queries (`.repos/graph/src/queries.ts:48-175`).

### Mutation lifecycle and error precedence

`endMutation` marks its source handle immutable and rejects a second finalization through `assertMutable`.
`mutateScoped` always calls `endMutation` in `finally` (`Graph.ts:623-634`). If a callback manually
calls `endMutation`, finalization in `finally` throws. If that callback then throws its own error, the finalization error
masks the callback error. Current tests cover ordinary callback failure and late mutation, but not manual finalization,
double finalization, or error precedence (`Graph.test.ts:970-1047`).

### Undirected self-loop storage and removal

Adding an undirected self-loop pushes the same edge index twice into both adjacency maps because source and target are
equal (`Graph.ts:2312-2334`). Removal happens to splice one entry in each of two passes over the same arrays
(`Graph.ts:2463-2499`), and node removal can collect the same edge index four times (`Graph.ts:2380-2402`). Public
neighbors hide the duplication with a `Set`, but the internal representation is fragile and can make later arc,
incident-edge, degree, and snapshot work count a loop two or four times by accident. Existing tests check only that an
undirected loop is a neighbor and a cycle (`Graph.test.ts:2186-2193`, `Graph.test.ts:2877-2887`); they do not verify
removal or adjacency-derived invariants after removing a loop-bearing node.

### Hash-law tests

Graph equality currently includes kind, stable indexes, allocator state, node data, and edge identity by edge index;
undirected edge endpoints are unordered. The approved contract removes allocator history from equality because it is not
active graph structure and is intentionally absent from `Schema.Graph`. Tests correctly assert that equal values have
equal hashes, but also assert that unequal allocator state or edge data must produce different hashes (`Graph.test.ts:170-220`,
`Graph.test.ts:859-889`). That converse is not a hash law: collisions are valid. Those assertions can fail after a valid
hash implementation change and should be replaced by equality assertions plus the one required implication,
`Equal.equals(a, b) => Hash.hash(a) === Hash.hash(b)`.

### Public edge copy semantics

`getEdge` and `edges` currently return a fresh shallow `Edge` envelope (`Graph.ts:240-246`, `Graph.ts:2531-2545`,
`Graph.ts:5729-5748`). The regression test mutates returned endpoint fields and proves graph structure is not exposed
(`Graph.test.ts:2040-2053`), but it does not pin freshness between calls, behavior for mutable graphs, or the intentional
sharing of `edge.data`. This behavior was introduced as a patch-level fix and must not drift into deep-copying payloads
or returning internal envelopes.

### Weight and A* heuristic contracts

Dijkstra and A* eagerly invoke `cost` for every edge before source-equals-target and early-target exits, reject negative
or `NaN` weights, and treat `+Infinity` as impassable (`Graph.ts:4136-4161`, `Graph.ts:4531-4556`). Tests pin global
validation, including unreachable/late negative edges and same-node queries (`Graph.test.ts:3209-3290`,
`Graph.test.ts:3429-3537`). This matches the lesson from `.repos/graph`: early-exit searches otherwise miss invalid
weights, so validation must precede search (`.repos/graph/src/algorithms/paths.ts:513-548`).

The remaining ambiguity is heuristic correctness. A* rejects non-finite estimates only when it evaluates them
(`Graph.ts:4558-4569`, `Graph.ts:4585-4647`) and permanently closes visited nodes. Its documentation says a heuristic
"should be consistent" (`Graph.ts:4474-4485`), while `.repos/graph` describes admissibility instead
(`.repos/graph/src/types.ts:472-484`). These are not interchangeable for this implementation: closed-node A* needs a
consistent heuristic for the stated shortest-path guarantee. Finite but inadmissible or inconsistent values are not
detectable locally and can return a non-shortest path.

### Parallel-edge path identity

`PathResult` exposes node indexes, total numeric distance, and edge payloads, but no edge indexes (`Graph.ts:4182-4186`).
After `a371754b1e`, immutable CSR implementations retain compact edge positions in predecessor state, but CSR lacks the
reverse projection to stable public `EdgeIndex`; mutable implementations still retain edge data directly. Two parallel
edges with equal payloads therefore remain indistinguishable in a returned path. `AllPairsResult.costs` has the same
ambiguity and collapses parallel choices into endpoint-keyed matrices. `.repos/graph` demonstrates
the required model: predecessor state retains edge identity and each path step exposes the selected edge
(`.repos/graph/src/algorithms/paths.ts:581-586`, `.repos/graph/src/algorithms/paths.ts:623-657`,
`.repos/graph/tests/algorithms.test.ts:257`).

Adding a required field to `PathResult` would change existing runtime object equality and the exported type. Existing
results must remain unchanged; edge identity requires additive APIs only.

### Type-level coverage

Current type tests cover constructors, mutation callback synchrony, opacity, variance, set operations, traversal kind
preservation, and `topo` rejection (`Graph.tst.ts:30-270`). They do not pin:

- data-first/data-last inference for `dijkstra`, `astar`, and `bellmanFord`;
- callback parameter inference for `cost` and `heuristic`;
- acceptance of immutable and mutable graphs while preserving graph kind;
- `successors` / `predecessors` rejection of undirected and unknown-kind graphs;
- directed-neighbor, traversal-radius, and edge-result configuration shapes;
- covariance of immutable results and invariance of mutable inputs at mutation entry points;
- the proposed edge-identified path overloads and the absence of edge indexes from legacy results.

## Desired contracts

### Radius

1. An omitted traversal radius means unbounded traversal; explicit `Infinity` is also accepted.
2. Every finite radius must be a non-negative integer. `-0` is equivalent to `0`.
3. `NaN`, `-Infinity`, negative values, and fractions throw `GraphError` with one stable message before a walker or
   neighborhood is returned. Empty `start` does not bypass radius validation.
4. Radius is minimum unweighted edge distance from any valid start. Radius zero yields each distinct start once.
5. `dfs`, `bfs`, `dfsPostOrder`, and `neighborhood` use exactly the same validator and boundary semantics.

Rejecting previously accepted invalid radii is compatibility-sensitive, but converts accidental behavior into the
repository-wide invalid-algorithm-input policy.

### Traversal iteration and configuration

1. Calling `dfs`, `bfs`, or `dfsPostOrder` validates and copies `start`; later mutation of the caller's array cannot
   affect any iteration. Each fresh iterator revalidates those copied starts against its captured graph state, so removing
   a start between walker creation and iteration produces the documented missing-node `GraphError` rather than an invalid
   compact lookup.
2. Creating a walker performs no graph traversal. Every call to `[Symbol.iterator]()` captures current graph structure
   and node data, and active iteration uses only that captured traversal state.
3. Mutations after iterator creation are not observed by that active iterator. A fresh iterator from the same walker
   observes graph state at its own creation time.
4. DFS and BFS perform bounded work as results are requested. Finite-radius postorder may compute the complete bounded
   reachable-node set at iterator creation before producing postorder output; document this explicit exception.
5. Distinct start nodes are prioritized in supplied order for BFS, DFS, and postorder. Duplicate starts do not duplicate
   output or alter the first occurrence's priority.

Copying `start` closes a validation hole and is the least surprising ownership contract. Changing DFS's current
last-root-first behavior is compatibility-sensitive and requires an exact regression fixture and release note.

### Neighbors and incidences

1. `neighbors`, `successors`, `predecessors`, and `neighborsDirected` return each reachable adjacent `NodeIndex` at most
   once, for both graph kinds.
2. Ordering is first occurrence in edge index/insertion order. For direction-ignored directed traversal, outgoing first
   occurrences precede new incoming first occurrences.
3. A self-loop contributes the node once to a neighbor-node result.
4. Parallel and reciprocal edges do not duplicate nodes. They remain distinct edge occurrences for algorithms, degree,
   capacity, flow, cycle, and future incident-edge queries.
5. Missing nodes continue to produce `[]` for neighbor queries, preserving current safe collection behavior.

### Mutation lifecycle

1. A mutable handle has one active lifetime. Public `endMutation` succeeds once; a second direct call throws
   `GraphError("Graph is not mutable")` as today.
2. Every public mutation checks lifetime before touching storage. A finalized handle can still be queried as the stale
   snapshot it contains, but cannot affect the immutable graph returned by finalization.
3. `directed`, `undirected`, `make`, and `mutate` finalize their callback handle exactly once on normal return or throw.
4. If a callback error and cleanup/lifecycle misuse both occur, the callback error is primary and must not be replaced
   by a cleanup `GraphError`. The handle must still be inactive when control returns.
5. If a callback manually finalizes and then returns normally, the scoped operation throws the lifecycle `GraphError`;
   it must not silently return an unknown immutable snapshot. Manual `beginMutation` / `endMutation` remains the API for
   callers that need explicit finalization.

The error-precedence and manual-finalization behavior is compatibility-sensitive only for callbacks already violating
the scoped lifetime contract.

### Undirected self-loops

1. One stored `EdgeIndex` represents one logical self-loop.
2. It contributes two endpoint incidences to graph-theoretic undirected degree, one edge to edge enumeration and edge
   count, one node to neighbor queries, and one cycle of length one.
3. Ordered traversal arcs may expose two loop incidences internally, but no internal combination of outgoing and
   incoming maps may turn them into four logical incidences.
4. `removeEdge` removes every internal incidence for exactly that edge and leaves parallel loops untouched.
5. `removeNode` removes every incident edge exactly once logically, including any number of self-loops and parallel
   non-loop edges. No stale edge index remains in another node's adjacency.

The concrete adjacency layout is private. Correctness tests should assert public behavior and a test-only invariant
checker, not freeze a particular map representation. The internal architecture plan owns the final ordered arc layout.

### Equality and hashing

1. Equality compares active indexed structure and payloads, not `nextNodeIndex`, `nextEdgeIndex`, or removed trailing
   allocator history. Graphs with identical active indexed nodes and edges are equal even if their next allocations differ.
2. For all graph values `a` and `b`, equality implies equal hashes. Unequal graphs may collide.
3. Undirected endpoint reversal preserves equality and hash; directed reversal does not preserve equality.
4. Parallel edges remain paired by stable `EdgeIndex`, not multiset-matched by payload.
5. Mutable graphs retain reference equality and stable reference hash for their active lifetime. Final immutable copies
   return to structural equality/hash behavior.

### Edge copies

1. Each successful `getEdge` call and each element emitted by a fresh or repeated `edges` iteration is a fresh `Edge`
   envelope, for immutable and mutable graph inputs.
2. Mutating a returned envelope through an unsafe cast cannot alter endpoints, adjacency, equality, hashing, or later
   reads of the graph.
3. `data` is copied by reference. Mutating a mutable payload is visible through later reads and can affect structural
   equality/hash; no deep immutability is promised.
4. `Option.none`, edge index ordering, and `Edge`'s own ordered endpoint equality remain unchanged.

### Weights and heuristics

1. Dijkstra and A* accept weights in `[0, +Infinity]`; `-0` is accepted as zero. They reject negative values, `NaN`, and
   `-Infinity` with `GraphError`. `+Infinity` means an impassable edge.
2. Their weight contract is graph-global: every stored edge is validated before same-node or early-target success, even
   if unreachable from the source. Callback exceptions propagate unchanged.
3. Bellman-Ford and Floyd-Warshall accept finite negative values and `+Infinity`, reject `NaN` and `-Infinity`, and keep
   their existing negative-cycle contracts. A later optimization plan may share validation code but may not weaken it.
4. A* accepts any finite heuristic value, including negative values. Every estimate that the algorithm evaluates must
   be finite or produce `GraphError`; it does not promise eager evaluation for unreachable nodes or the trivial
   source-equals-target result.
5. Shortest-path optimality from A* is guaranteed only when the caller supplies a consistent heuristic with
   `h(target) = 0`: for each traversable edge `(u, v)`, `h(u) <= weight(u, v) + h(v)`. Consistency implies admissibility
   under these contracts. The library validates finiteness, not consistency.
6. With `heuristic: () => 0`, A* must agree with Dijkstra on reachability and distance. Deterministic tie breaking follows
   edge insertion/index order; a particular equal-cost path is stable but not part of mathematical optimality.

Documenting consistency as a caller precondition is not a behavior break. Changing A* to reopen closed nodes and offer
an admissible-only guarantee would be a separate compatibility-sensitive algorithm change and is out of scope here.

### Edge-identified paths

Plan 05 exclusively owns the additive `Path` / `WeightedPath` model and all public edge-identified path APIs. This plan
owns only the compatibility contract: `PathResult<E>` remains exactly `{ path, distance, costs }` in type and runtime
shape, and existing `dijkstra`, `astar`, and `bellmanFord` calls retain their signatures and result shapes. Do not add
`EdgePathResult`, `includeEdges`, optional edge-index fields, or overloads to existing algorithms.

The shared predecessor state owned by plan 03 retains `EdgeIndex` internally. Legacy results project selected edge data
from that state; additive plan-05 APIs project `Path` / `WeightedPath`. Parallel equal-data edges must be distinguishable
through the additive model without altering legacy deep equality. Edge-aware all-pairs output remains gated in plan 05.

## Phased TDD plan

### Phase 1: Freeze the contract fixtures

1. Add small directed and undirected fixtures containing reciprocal edges, equal-data parallel edges, parallel
   self-loops, sparse indexes, and mixed insertion directions.
2. Add a test-only invariant checker that derives expected endpoint incidences from `Graph.edges`; if private storage
   inspection is necessary, keep it local to `Graph.test.ts` and use it only to detect stale/over-counted indexes.
3. Correct hash tests first: remove unequal-implies-different assertions and add a table/property-style equality-implies-
   same-hash check over endpoint reversal, parallel edges, self-loops, and undefined payloads. Add equal graph pairs with
   different allocator histories and assert equal hashes.

Verify: tests fail only for the newly demonstrated semantic gaps, not for hash collisions.

### Phase 2: Radius and neighbor semantics

1. Add failing tests for every invalid radius against DFS, BFS, postorder, and neighborhood, including empty starts and
   data-last forms.
2. Add tests proving `start` is copied, a removed start is revalidated by each fresh iterator, fresh iterators snapshot
   current mutable state, active iterators remain isolated, and all traversal families prioritize distinct roots in
   supplied order. Retain the documented bounded-postorder membership pass rather than treating it as an
   eager-traversal regression.
3. Add directed parallel/self-loop and direction-ignored reciprocal-edge tests that pin unique stable ordering.
4. Introduce one internal radius validator and separate unique-node lookup from multiplicity-preserving edge/arc
   iteration. Do not reuse deduplicated neighbors in `topo`, degree, or weighted algorithms.
5. Copy `start` after eager validation and reverse DFS's initial compact-root push so first occurrence has first priority.
6. Update JSDoc to state the exact radius domain, snapshot timing, bounded-postorder exception, uniqueness, and ordering.

Verify: radius matrix and neighbor matrix pass; existing traversal and topological tests remain unchanged.

### Phase 3: Lifecycle and self-loop mutation invariants

1. Add failing tests for direct double finalization, callback manual finalization on normal return, callback error after
   manual finalization, and all mutators used through a finalized handle.
2. Add undirected loop tests for removing one of multiple loops, removing a loop-bearing node, re-adding after removal,
   and preserving unrelated/parallel edges.
3. Make scoped cleanup preserve the primary callback error while still deactivating the handle. Keep public
   `endMutation` single-use.
4. Normalize or robustly consume loop incidences so removal is independent of duplicate collection. Coordinate any
   representation change with the internal architecture owner.

Verify: no callback error is masked; invariant checker reports no stale adjacency after every mutation sequence.

### Phase 4: Edge copies and weighted search contracts

1. Extend copy tests across repeated getters, repeated walkers, active mutable graphs, unsafe envelope mutation, and a
   mutable object payload demonstrating intentional shallow sharing.
2. Add a shared weight matrix for Dijkstra, A*, Bellman-Ford, and Floyd-Warshall: `-Infinity`, negative finite, `-0`,
   zero, finite positive, `+Infinity`, and `NaN`; include unreachable invalid edges and source-equals-target.
3. Add A* tests for invalid source estimate, invalid discovered estimate, zero-heuristic equivalence, negative finite
   consistent estimates, and a documented inconsistent-heuristic counterexample that does not claim optimality.
4. Align JSDoc for every weighted config/result. Avoid promising callback counts beyond graph-global validation where
   that is part of correctness.

Verify: weighted algorithms agree on their documented domains and A* never claims an unconditional shortest path.

### Phase 5: Prepare edge-identified reconstruction

1. Add regression tests proving the exact legacy `PathResult` runtime shape and ambiguity for equal-data parallel edges.
2. Coordinate with plan 03 to retain `EdgeIndex` in predecessor records and derive legacy `costs` from selected edges.
3. Leave all public edge-identified models, utilities, and enumeration APIs to plan 05.

Verify: internal edge identity survives reconstruction and all old result deep-equality tests pass unchanged.

## Test matrix

| Area | Directed | Undirected | Parallel edges | Self-loop | Sparse/removal | Mutable | Data-last |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Radius validation/boundary | yes | yes | representative | yes | yes | yes | yes |
| Traversal snapshot/config/order | all directions and multiple roots | all directions and multiple roots | representative | yes | start removed between iterations | primary subject | yes |
| Neighbor uniqueness/order | outgoing/incoming/ignored | both authored orders | equal and unequal data | one result | missing node | yes | yes |
| Mutation lifecycle | yes | yes | yes | yes | remove/re-add | primary subject | n/a |
| Adjacency/removal invariant | yes | yes | multiple | multiple | node and edge removal | yes | n/a |
| Equality/hash law | yes | endpoint reversal | paired by index | yes | allocator history ignored | reference law | n/a |
| Edge copy semantics | yes | yes | yes | yes | missing edge | yes | getter yes |
| Weight domain | all four algorithms | reverse traversal | lightest/tie | source=target | unreachable invalid edge | yes | yes |
| A* heuristic | consistent/zero/inconsistent | representative | tie | source=target | unreachable node | yes | yes |
| Legacy path compatibility | Dijkstra/A*/Bellman-Ford | reverse traversal | equal payload ambiguity pinned | trivial path | removed indexes absent | yes | yes |

Use regular `it` and `assert` from `@effect/vitest` for these synchronous tests. Do not add `Effect.runSync`, timers, or
random unseeded fixtures. Any property test introduced by the verification-foundation plan should consume the same
seeded fixtures rather than duplicate generators.

## Type-test additions

Extend `packages/effect/typetest/Graph.tst.ts` with focused blocks for:

1. `dijkstra`, `astar`, and `bellmanFord` data-first/data-last inference on directed, undirected, and mutable graphs.
2. Exact `E` inference for `cost`, exact `N` inference for both A* heuristic parameters, and kind preservation.
3. Compile-time rejection of `successors`, `predecessors`, `neighborsDirected`, and `topo` for undirected and
   non-narrowed `Kind` graphs without `as any`.
4. Existing weighted algorithms returning `Option.Option<PathResult<E>>`, with no edge-index field or edge-aware config.
5. Mutation callbacks remaining synchronous and unable to return the result of `endMutation` where `undefined` is
   required.
6. Immutable graph covariance and mutable graph invariance at each changed overload, including data-last partial
   application.

## Validation commands

Run the narrowest repository gates after each phase from the workspace root:

```sh
pnpm lint-fix
pnpm --filter effect test --run test/Graph.test.ts
pnpm test-types Graph.tst.ts
pnpm check
```

When JSDoc examples in `Graph.ts` change, also run:

```sh
pnpm doctest --run packages/effect/src/Graph.ts
```

Never use bare `pnpm test` or bare `pnpm doctest`. The implementation PR should record any pre-existing failures
separately from failures introduced by these phases.

## Changesets and compatibility notes

- Radius rejection, defensive `start` copying, DFS root-priority correction, directed neighbor deduplication, lifecycle
  error precedence, and any self-loop removal correction
  are runtime behavior fixes. Ship them with an `effect` patch changeset that explicitly calls out invalid-radius
  rejection, DFS multi-root ordering, and directed parallel-neighbor deduplication as compatibility-sensitive.
- Edge-copy documentation/tests need no new changeset if behavior remains unchanged. A runtime correction to copy
  freshness does require a patch changeset.
- Hash-test corrections alone require no changeset. Removing allocator history from equality/hash is an approved runtime
  correction and requires a patch changeset that calls out the compatibility-sensitive semantic change.
- Plan 05 owns changesets for additive edge-identified path APIs. Keep behavior-fix and additive-API changesets separate
  so release notes distinguish corrected semantics from new capability.

## Dependencies and ownership boundaries

- **Requires:** no earlier graph plan. This plan establishes the contracts all later plans require.
- **Verification and benchmark foundations:** owns seeded generators, property/differential harnesses, and reusable
  oracle adapters. This plan owns only deterministic regression fixtures and the hash-law assertions needed now.
- **Internal architecture and performance kernel:** owns the ordered arc iterator, dense snapshot, and final adjacency
  representation. It must implement the self-loop incidence and stable-order contracts here; this plan must not create
  a competing permanent representation.
- **Core queries and transforms:** owns additive incident-edge/edges-between/degree APIs. Those APIs must preserve edge
  multiplicity while neighbor-node APIs remain unique. This plan does not add degree solely to expose an internal fix.
- **Traversal and path features:** exclusively owns the public `Path` / `WeightedPath` model, edge-aware path utilities,
  all-pairs edge identity, and multi-path APIs. It consumes plan 03 reconstruction and may not alter `PathResult`.
- **Connectivity and DAG algorithms:** owns cycle/component/topological feature expansion. It depends on correct
  self-loop/parallel incidence and must not derive edge multiplicity from unique neighbors.
- **Internal architecture and performance kernel:** owns the shared named weight/capacity policy implementation. Domain
  algorithms consume it and cannot weaken graph-global Dijkstra/A* validation or redefine `+Infinity`.
- **Schema serialization:** out of scope. Snapshot/hydration must preserve stable edge indexes and rebuild adjacency
  according to these incidence contracts; it must not serialize mutable lifecycle state.
- **Effect-native interruption:** out of scope until synchronous kernels stabilize. Additive interrupted variants must
  report the same validation errors and path identities as synchronous variants.
- **DOT, Mermaid, and consolidated docs:** may proceed independently after edge ordering and copy semantics are fixed;
  they must continue to emit each logical self-loop and parallel edge once.

Completion criterion: every contract above is represented by a deterministic runtime or type-level regression test,
all compatibility-sensitive fixes are called out in changesets, legacy API signatures and legacy path-result object
shapes remain intact, and later plans can consume one unambiguous definition of node uniqueness, edge multiplicity,
self-loop incidence, traversal snapshot/configuration ownership, weight validity, and path edge identity.
