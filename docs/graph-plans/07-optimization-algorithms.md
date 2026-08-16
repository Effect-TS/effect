# Optimization Algorithms

## Scope

Minimum spanning tree/forest is approved for active implementation. The other three families remain designed but parked
until a concrete consumer and separate maintainer approval exist:

1. Minimum spanning tree/forest.
2. Eulerian path and circuit.
3. Maximum-cardinality bipartite matching.
4. Maximum flow and minimum cut.

Only items 1 and 2's shared prerequisites may land without reopening scope, and only item 1 may add public exports now.
Do not implement Eulerian traversal, matching, or flow/cut merely for parity with the reference library.

This plan does not add shortest paths, simple-path enumeration, or k-shortest paths; those remain in plan 05. It does
not add connected components, strongly connected components, bridges, articulation points, or a second public
bipartite predicate; connectivity remains in plan 06 and existing `isBipartite` behavior remains non-breaking. Matching
may refactor the existing coloring implementation into a plan-03 internal helper, but must not create a competing
coloring kernel or assign it to plan 06.

The work is additive. All algorithms accept immutable and scoped-mutable graphs, are synchronous initially, preserve
stable public `NodeIndex` and `EdgeIndex` values in their results, and throw `GraphError` for invalid structural or
numeric input. They must not rebuild a result graph with newly allocated indexes.

## Lessons From The Reference Repository

The implementations in `.repos/graph` establish useful starting points but should not be copied as contracts:

- Its Prim implementation correctly restarts for disconnected components, making the nominal tree API return a
  forest, and its tests catch the earlier one-component bug. Kruskal handles forests more naturally and is simpler to
  make deterministic.
- Its Euler implementation uses iterative Hierholzer traversal, checks degree conditions, permits either odd endpoint
  for an undirected path, and verifies that every edge was consumed. Retaining edge identity is essential for parallel
  edges.
- Its Hopcroft-Karp implementation derives a partition by coloring every component, rejects self-loops/non-bipartite
  inputs, and reports the realizing edge for parallel-edge pairs.
- Its Edmonds-Karp implementation shares one residual solver between max flow and min cut and tests the
  max-flow/min-cut equality, flow conservation, parallel capacity, unreachable sinks, and endpoint validation.
- The reference permits mixed edge modes and models an undirected edge as two independent directed capacities. Effect
  Graph has only uniformly directed or undirected kinds, so this plan chooses narrower, explicit applicability instead.
- The reference numeric validation misses `NaN` and infinities in several places. This plan validates all accessor
  results before algorithm-specific early returns.

## Applicability Matrix

| Family | Directed graph | Undirected graph | Empty graph |
| --- | --- | --- | --- |
| Minimum spanning forest | Rejected | Supported | Empty forest |
| Eulerian path/circuit | Supported | Supported | Trivial empty trail |
| Maximum bipartite matching | Rejected | Supported | Empty matching |
| Maximum flow/minimum cut | Supported | Rejected | Endpoints cannot be supplied, so `GraphError` |

Directed MST is deliberately rejected. A directed minimum arborescence is a different problem with a required root
and different semantics; it should receive a separately named future API rather than silently ignoring direction.
The public MST and matching signatures should require `"undirected"`; a value passed through `any` or an erased kind
must still receive a runtime `GraphError`.

Flow is initially directed-only. Treating an undirected edge as two independent capacities, a shared absolute
capacity, or a pair with net-flow reporting produces observably different answers and cut semantics. Users can model
their intended policy by adding explicit directed edges. A future undirected-flow API should be separately specified.

## Shared Numeric Policy

Consume plan 03's internal facility that evaluates a numeric edge accessor exactly once per edge in ascending
`EdgeIndex` order and reports the first invalid edge through `GraphError`. It retains an `EdgeIndex -> number` mapping
and supports named policies rather than one supposedly universal validator. Do not add a plan-07 or plan-05 copy.

| Use | Allowed | Rejected |
| --- | --- | --- |
| MST weight | Any finite number, including negative values and zero | `NaN`, `Infinity`, `-Infinity` |
| Flow capacity | Finite number greater than or equal to zero | Negative values, `NaN`, `Infinity`, `-Infinity` |

Negative MST weights are valid: spanning-tree optimality does not require non-negative weights. Normalize `-0` to
`0` in totals and flow output. Infinite MST weights are rejected rather than treated as absent edges; omitting an edge
is the unambiguous way to make it unavailable. Infinite capacities are rejected because they can produce an infinite
flow and non-progressing residual arithmetic.

Validation occurs before empty/trivial-result shortcuts so malformed edge data is never hidden by an early return.
Accessor exceptions propagate unchanged, matching existing cost-accessor behavior; only invalid returned numbers
become `GraphError`.

The existing shortest-path policies remain unchanged. Their acceptance of positive infinity as an impassable edge is
algorithm-specific and should not force MST or capacity semantics.

## Proposed Public Models

Names are provisional until implementation review, but the result shape and information content are contractual.

```ts
export interface MinimumSpanningForestConfig<E> {
  readonly weight: (edgeData: E) => number
}

export interface SpanningTreeResult {
  readonly nodes: ReadonlyArray<NodeIndex>
  readonly edges: ReadonlyArray<EdgeIndex>
  readonly weight: number
}

export interface MinimumSpanningForestResult {
  readonly trees: ReadonlyArray<SpanningTreeResult>
  readonly edges: ReadonlyArray<EdgeIndex>
  readonly weight: number
}

export interface EulerianConfig {
  readonly start?: NodeIndex
}

export interface EulerianTrail {
  readonly nodes: ReadonlyArray<NodeIndex>
  readonly edges: ReadonlyArray<EdgeIndex>
  readonly circuit: boolean
}

export interface BipartiteMatch {
  readonly left: NodeIndex
  readonly right: NodeIndex
  readonly edge: EdgeIndex
}

export interface MaximumBipartiteMatchingResult {
  readonly matching: ReadonlyArray<BipartiteMatch>
  readonly left: ReadonlyArray<NodeIndex>
  readonly right: ReadonlyArray<NodeIndex>
  readonly unmatched: ReadonlyArray<NodeIndex>
}

export interface FlowConfig<E> {
  readonly source: NodeIndex
  readonly sink: NodeIndex
  readonly capacity: (edgeData: E) => number
}

export interface MinimumCutResult {
  readonly capacity: number
  readonly edges: ReadonlyArray<EdgeIndex>
  readonly source: ReadonlyArray<NodeIndex>
  readonly sink: ReadonlyArray<NodeIndex>
}

export interface MaximumFlowResult {
  readonly value: number
  readonly flow: ReadonlyMap<EdgeIndex, number>
  readonly cut: MinimumCutResult
}
```

The candidate functions are:

- `minimumSpanningForest(graph, config)` returning `MinimumSpanningForestResult`.
- `minimumSpanningTree(graph, config)` returning `Option<SpanningTreeResult>` and delegating to the forest kernel.
- `eulerianPath(graph, config)` returning `Option<EulerianTrail>`.
- `eulerianCircuit(graph, config)` returning `Option<EulerianTrail>`.
- `maximumBipartiteMatching(graph)` returning `MaximumBipartiteMatchingResult`.
- `maximumFlow(graph, config)` returning `MaximumFlowResult`.
- `minimumCut(graph, config)` returning `MinimumCutResult` and delegating to the same residual solver as
  `maximumFlow`.

Every configurable function must have standard `dual` data-first/data-last overloads. Euler configuration should be
optional at the semantic level; if the repository's dual conventions make an omitted second argument ambiguous, use
an explicit empty config in the dual API rather than adding a second non-dual calling convention. Matching has no
configuration and remains a unary function.

`Option.none` means that no Eulerian trail of the requested kind exists. Missing configured nodes, wrong graph kind,
non-bipartite matching input, identical flow endpoints, and invalid numeric values are invalid inputs and throw
`GraphError`; they are not ordinary negative results. The models are plain readonly interfaces, not new tagged error
types. `GraphError` remains the shared invalid-input ADT.

Do not return edge data in place of identity. Callers can resolve retained indexes with `getEdge`, including when
parallel edges carry equal data. A read-only type annotation does not make a JavaScript `Map` immutable, so the flow
map must be newly owned by the result and never retained internally or reused across calls.

## Minimum Spanning Forest

### Algorithm Decision

Implement Kruskal with a disjoint-set union structure as the production kernel.

- It produces a full minimum spanning forest without component restarts.
- It handles sparse stable indexes through the dense snapshot or an index-to-position map.
- Self-loops fall out naturally because both endpoints already have the same representative.
- Parallel edges remain independent candidates.
- Deterministic tie-breaking is direct: sort by `(weight, EdgeIndex)`.
- Complexity is `O(E log E + V alpha(V))` time and `O(V + E)` working memory.

Do not expose an algorithm selector in the first API. It expands the behavioral surface without changing the result
contract. Maintain an internal Prim implementation only if useful as an independent differential oracle and benchmark
candidate. If later benchmarks establish a material dense-graph benefit, Prim can replace the kernel without an API
change.

### Forest Contract

- A disconnected graph returns one minimum tree per connected component, including a zero-edge tree for every
  isolated node. The API is named `minimumSpanningForest` so this is not surprising.
- A connected non-empty graph has one tree. An empty graph has no trees, no edges, and total weight zero.
- `minimumSpanningTree` returns that one tree for a connected non-empty graph and `Option.none` for an empty or
  disconnected graph. A one-node graph therefore has a zero-edge minimum spanning tree. Invalid kind/weights still
  throw before this projection.
- `trees` are ordered by their lowest `NodeIndex`; each tree's `nodes` and `edges` are ascending by public index.
  Top-level `edges` is the selected edge set in ascending index order, not selection order.
- The total edge count is `V - C`, where `C` includes isolated components.
- Self-loops are never selected, including negative self-loops.
- Parallel edges compete independently; lower weight wins and equal weight chooses lower `EdgeIndex` when either can
  occupy the same forest position.
- Negative and zero weights are accepted under the shared policy.
- No input graph, edge, node, or edge data is copied or mutated.

## Eulerian Paths And Circuits

Use iterative Hierholzer traversal with an ordered arc view retaining `EdgeIndex`. Complexity is `O(V + E)` time and
`O(V + E)` memory. Recursion is not acceptable because a valid trail may contain every edge in a large graph.

### Existence Rules

- Directed circuit: every non-isolated node has equal in-degree and out-degree, and all non-isolated nodes belong to
  one weakly connected component; consuming all edges is the final authoritative check.
- Directed open path: exactly one node has `out - in = 1`, exactly one has `in - out = 1`, and all others balance.
  A circuit also satisfies `eulerianPath`.
- Undirected circuit: every non-isolated node has even graph-theoretic degree and the non-isolated subgraph is
  connected.
- Undirected open path: exactly two odd-degree nodes; a circuit also satisfies `eulerianPath`.
- Isolated nodes do not invalidate a trail over a non-empty edge component.

If `start` is omitted, choose the required directed start, otherwise the lower-index odd endpoint, otherwise the
lowest-index node incident to an edge. For an edgeless non-empty graph choose the lowest node. If `start` exists but is
not a valid start for the requested trail, return `Option.none`; if it is not present in the graph, throw `GraphError`.

The empty graph has one trivial path/circuit represented by `nodes: []`, `edges: []`, and `circuit: true`. An edgeless
non-empty graph returns the one-node trivial circuit chosen by the start rule. This makes both APIs total over valid
graphs and avoids inventing a missing node.

### Multigraph Rules And Ordering

- A self-loop is one consumed edge. It contributes one incoming and one outgoing incidence in a directed graph and
  two to undirected degree.
- Every parallel edge is consumed separately. Never identify usage by endpoint pair or edge data.
- Outgoing/incident arcs are considered in ascending `EdgeIndex` order. Hierholzer backtracking then determines the
  unique documented deterministic result; add exact fixtures so implementation refactors preserve it.
- `nodes.length === edges.length + 1` for non-empty-node trails, adjacent node pairs are realized by the corresponding
  edge index, every graph edge appears exactly once, and a circuit's first and last node agree.
- This is edge-covering trail work, not simple/shortest path work from plan 05.

These APIs return one result, so a generator adds no useful early-exit behavior: existence cannot be confirmed until
all edges have been accounted for. Keep them eager.

## Maximum Bipartite Matching

Implement maximum-cardinality matching with iterative Hopcroft-Karp over the deterministic two-coloring supplied by
plan 06. Target complexity is `O(E sqrt(V))` time and `O(V + E)` memory. Avoid recursive augmenting DFS if it can grow
with graph size; use explicit frames or otherwise prove the implementation stack-safe.

- Only undirected graphs are accepted. Direction-erased calls on directed graphs throw `GraphError`.
- A self-loop makes the graph non-bipartite, so matching throws `GraphError` identifying the lowest-index conflict
  edge reported by the coloring kernel.
- Parallel edges do not increase cardinality between a fixed pair. If that pair is matched, retain the first/lower
  `EdgeIndex` encountered by deterministic adjacency.
- Disconnected components are matched independently by the same global run. Empty and edgeless graphs return an empty
  matching.
- Coloring starts each uncolored component at its lowest `NodeIndex` on the left (`0`) side. This fixes the otherwise
  arbitrary left/right orientation, including isolated nodes.
- BFS roots, adjacency, and augmenting choices use ascending node/edge index order. Return matches in ascending `left`
  index order; partitions and unmatched nodes are ascending.
- `unmatched` includes isolated nodes and is the ascending complement of all matched endpoints.

The derived partitions are included because they make the orientation of each match explicit and reusable. Supplying
custom partitions, weighted matching, minimum vertex cover, and assignment costs are separate future APIs.

The output is bounded by `V / 2` and computing any item requires completing augmentations, so no lazy form is useful.

## Maximum Flow And Minimum Cut

Implement one internal residual-network solver and project both public results from it. Start with Dinic rather than
the reference's Edmonds-Karp: Dinic has `O(V^2 E)` worst-case time on general directed networks and performs materially
better on the larger sparse networks expected here; Edmonds-Karp's `O(V E^2)` is useful as a small-graph test oracle.
The residual representation should use dense positions internally but retain the originating `EdgeIndex` on each
forward arc.

### Flow Contract

- Validate that source and sink exist and differ, and validate every capacity before returning a zero/trivial result.
- Directed self-loops have zero useful source-to-sink flow. Keep them in the returned flow map with value zero, but do
  not add them to level-graph work or a cut.
- Parallel edges are separate capacity-bearing arcs; their capacities add naturally and each receives its own flow
  entry.
- Zero-capacity edges remain in the flow map with zero and never enter an augmenting level graph.
- `flow` contains every input `EdgeIndex` in ascending insertion/index order. Values satisfy `0 <= flow[e] <=
  capacity[e]`; there is no signed reverse-edge convention for directed graphs.
- Flow conservation holds at every node except source and sink, and source outflow minus inflow equals `value`.
- Deterministic BFS and blocking-flow traversal follow ascending edge-index order. Alternative maximum flows are
  possible, so deterministic ordering is part of the returned per-edge-flow contract.

After maximum flow, residual reachability from source defines the minimum cut. `cut.source` and `cut.sink` partition
every node exactly once in ascending `NodeIndex` order, with source and sink on their named sides. `cut.edges` contains
all original forward edges crossing source-side to sink-side in ascending `EdgeIndex` order. Its summed capacity equals
both `cut.capacity` and the maximum-flow value, within exact JavaScript arithmetic for the supplied numbers.

`minimumCut` runs the same solver rather than duplicating logic. `maximumFlow` includes the cut because it is already
available after the residual solve; the separate function is a convenience projection, not a second algorithm.

Flow and cut are single optimized results and are eager. Do not expose a lazy stream of augmentations as public API.
The inner BFS/blocking-flow loops should invoke the shared synchronous checkpoint abstraction at bounded intervals so
an additive Effect-native interruptible form can be introduced later without changing the kernel.

## Internal Architecture

Reuse the groundwork coordinated in the README:

- Ordered arc iteration for Euler traversal, matching adjacency, and residual construction.
- Dense snapshots for disjoint-set arrays, degree arrays, coloring, matching, and residual networks while preserving
  sparse public indexes at the boundary.
- Shared edge numeric evaluation for weights and capacities.
- A stable min-heap only if an internal Prim oracle is retained; do not create a second heap beside plan 05's heap.
- The existing bipartite coloring semantics, factored into plan 03 internals if reuse is justified.
- Synchronous checkpoints in potentially long matching and flow loops.

Keep kernels internal to `Graph.ts` unless the internal architecture plan establishes a dedicated module seam. Do not
export residual arcs, disjoint sets, dense positions, coloring arrays, or algorithm selectors.

## Implementation Phases

### Phase 1: Contracts And Shared Validation

- Finalize names and readonly result interfaces.
- Land/reuse ordered edge-aware arcs, dense index translation, numeric evaluation, and plan 06 coloring.
- Add type-level tests for graph-kind restrictions and both dual call forms.
- Add invalid numeric and missing-node tests before algorithm kernels.

### Phase 2: Minimum Spanning Forest

- Implement deterministic Kruskal and component/result assembly.
- Cover disconnected graphs, isolated nodes, negative weights, self-loops, parallel edges, sparse indexes, and ties.
- Add an internal Prim oracle for differential tests only if this does not duplicate shared heap work.

### Phase 3: Eulerian Trail

Status: parked; requires a separate demand/API approval.

- Implement stack-safe Hierholzer traversal for both graph kinds.
- Cover all degree/existence cases, disconnected edge components, explicit starts, empty graphs, loops, parallel edges,
  and exact edge-index order.

### Phase 4: Bipartite Matching

Status: parked; requires a separate demand/API approval.

- Implement stack-safe deterministic Hopcroft-Karp using plan 06 coloring.
- Cover multiple components, isolated nodes, non-bipartite rejection, parallel edges, and known greedy counterexamples.

### Phase 5: Flow And Cut

Status: parked; requires a separate demand/API approval.

- Implement residual construction and deterministic Dinic.
- Project both result forms from the same solved state.
- Add capacity, conservation, cut, loops, parallel edges, sparse indexes, and deterministic tie tests.

### Phase 6: Documentation And Performance

- Add public JSDoc, runnable bounded examples, cross-links, complexity, graph-kind restrictions, numeric policies, and
  multigraph gotchas.
- Run doctests for changed examples and add a package changeset describing the additive APIs.
- Establish benchmark baselines and only then consider kernel-level tuning.

Each phase should be independently reviewable. Do not combine this work with shortest-path or connectivity rewrites.

## Verification Strategy

### Example And Regression Tests

- MST: textbook weighted graph, already-a-tree, disconnected forest, isolated nodes, empty graph, negative weights,
  equal ties, negative self-loop exclusion, lighter parallel edge selection, and deleted-index sparsity.
- Euler: directed/undirected open trails and circuits, wrong degree counts, disconnected non-isolated components,
  optional starts, isolated nodes, loops, two parallel undirected edges forming a circuit, and exact once-only edge use.
- Matching: even cycles, grids, disconnected components, empty graph, self-loop/odd-cycle rejection, parallel edges,
  perfect and imperfect matchings, and an instance where greedy matching is suboptimal.
- Flow: the CLRS value-23 network, unreachable sink, antiparallel and parallel directed edges, incoming source/outgoing
  sink edges, zero capacities, self-loops, fractional capacities, malformed capacities, and deterministic alternate
  optima.

### Property And Differential Tests

Use seeded small multigraph generators and shrinkable fixtures from the verification foundation.

- MST forest is acyclic, spans every input node, has `V - C` edges, and selects only input edge indexes.
- Production Kruskal and an independent Prim implementation agree on total forest weight and per-component edge count.
  They need not select the same edges under ties unless both use the specified tie policy.
- For very small graphs, compare MST weight with exhaustive subsets.
- Every Euler result has valid endpoint continuity, consumes each edge index exactly once, and satisfies the appropriate
  endpoint/circuit condition. For small graphs, compare existence with exhaustive edge-trail search.
- Every matching uses existing edge indexes and no node twice. Compare cardinality with exhaustive matching and with a
  unit-capacity max-flow reduction on generated bipartite graphs.
- Every flow obeys capacity constraints and conservation. Compare value with an independent Edmonds-Karp oracle on
  small integral networks.
- Assert `maximumFlow.value === minimumCut.capacity`, cut-edge capacity equals that value, and removing/capping cut
  edges disconnects residual source from sink.
- Re-run each algorithm on the same graph and assert structurally equal, index-identical output.
- Compare supported simple-graph cases with a maintained external oracle adapter where available; do not let an oracle
  erase parallel edge identity before local invariants are checked.

Avoid approximate assertions unless a property fixture uses fractional capacities that genuinely accumulates floating
roundoff. If approximation is required, use a documented scale-aware tolerance and still enforce non-negative residual
capacity within that tolerance.

## Benchmarks

Add seeded, non-CI-gating benchmark cases with sparse and dense shapes:

- Kruskal on sparse forests, dense complete graphs, heavy parallel-edge graphs, and many disconnected components;
  compare internal Prim where retained.
- Euler traversal on long trails, loop-heavy multigraphs, and high-degree parallel-edge graphs.
- Hopcroft-Karp on balanced random bipartite graphs, grids, and adversarial layered graphs; compare a simple augmenting
  path oracle only at small sizes.
- Dinic on sparse random networks, dense networks, layered worst-case-like networks, and parallel-edge networks;
  compare Edmonds-Karp throughput and allocations.

Record wall time and peak/allocation proxies already supported by the benchmark foundation. Include graphs with sparse
public indexes to catch accidental allocation by maximum index. Benchmarks justify internal algorithm replacement but
must not loosen deterministic or numeric contracts.

## Documentation And Release Requirements

Every exported interface and function needs repository-compliant JSDoc with `@since`, exactly one category, graph-kind
applicability, complexity, failure behavior, deterministic ordering, and self-loop/parallel-edge semantics. Runnable
examples must use stable semantic assertions and retain edge indexes in observations. Cross-link `isBipartite`, plan
05 path APIs, plan 06 connectivity APIs, and the max-flow/min-cut pair where relevant.

Each approved family is an additive exported API change and requires its own package changeset. Run `pnpm lint-fix`, targeted
`packages/effect/test/Graph.test.ts` tests, relevant type tests, `pnpm check`, and `pnpm doctest --run
packages/effect/src/Graph.ts`; never run the unbounded whole-suite commands.

## Dependencies And Ownership

Required earlier work:

- Correctness and verification plans for seeded generators, oracle adapters, multigraph invariants, and benchmark
  conventions.
- Internal architecture/performance work for ordered edge-aware arcs, optional dense snapshots, and checkpoints.
- Plan 05 for shared heap/path-era numeric-accessor conventions; this plan does not own shortest or simple paths.
- Existing `isBipartite` semantics and plan 06 connectivity semantics; this plan does not own components or a new
  bipartite public API.

Work that can proceed independently once result names are agreed:

- Kruskal and Euler kernels need only ordered edge iteration and dense translation.
- Matching can begin after the coloring contract is stable.
- Flow can begin after numeric evaluation and dense translation are stable and does not depend on plan 05 path
  reconstruction.

This plan owns the optimization result interfaces, the domain semantics of MST/cut/flow numeric policies, deterministic
optimization tie rules, residual network, disjoint set, Hierholzer traversal, Hopcroft-Karp state, and Dinic state. Plan
03 owns their shared numeric evaluation machinery. This plan should consume, not fork, helpers owned by earlier plans.
