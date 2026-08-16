# Connectivity and DAG Algorithms

## Scope

This plan adds structural analyses that sit above the core queries and traversal kernels: undirected cut structure,
directed weak components, SCC condensation, transitive reduction, and rooted dominance. It also hardens the ordering
and stack-safety contracts of the existing component algorithms without changing their public signatures.

This plan does not own:

- `hasPath`, `isConnected`, `isTree`, or other basic boolean queries, which belong to plan 04.
- Cycle enumeration or cycle result types, which belong to plan 05. This plan may call `isAcyclic` but must not add a
  second cycle finder.
- Cycle witnesses from failed DAG operations. This plan owns the existing `topo` API and its ordering/error hardening,
  but cycle result types and enumeration remain in plan 05.
- Bipartite analysis, spanning trees, flow, centrality, or community detection.
- Effect-native interruption wrappers. The synchronous kernels should use the shared checkpoint abstraction so a
  later plan can add wrappers without duplicating algorithms.

The work is additive except for internal replacement of recursive or allocation-heavy kernels and regression tests
that pin existing behavior. Existing signatures for `connectedComponents`, `stronglyConnectedComponents`,
`isAcyclic`, and `topo` remain unchanged.

## Current Baseline

`Graph.ts` currently provides:

- Stack-safe directed and undirected `isAcyclic`, including the established rules that a self-loop is a cycle and two
  parallel undirected edges form a cycle.
- Eager `connectedComponents` for undirected graphs.
- Stack-safe Kosaraju `stronglyConnectedComponents` for directed graphs, with a runtime `GraphError` for an
  undirected graph passed through an unsafe cast.
- A dual, lazy Kahn `topo` walker for directed DAGs. It throws `GraphError` for undirected or cyclic inputs and
  prioritizes valid configured initial nodes.

The reference repository adds bridges, articulation points, node-only biconnected components, transitive reduction,
and a Cooper-Harvey-Kennedy dominator tree. Its coverage establishes useful fixtures and edge cases, but its recursive
low-link, SCC, and reachability implementations are not stack-safe, its biconnected result loses edge identity, and
its connectivity implementation does not adequately specify multigraph and self-loop behavior. Those details must
not be copied implicitly.

## Applicability and Semantics

| Analysis | Directed graph | Undirected graph | Cycles allowed |
| --- | --- | --- | --- |
| Existing `connectedComponents` | No | Yes | Yes |
| `weaklyConnectedComponents` | Yes | No; use `connectedComponents` | Yes |
| `isWeaklyConnected` | Yes | No; use `isConnected` | Yes |
| Existing `stronglyConnectedComponents` | Yes | No | Yes |
| `isStronglyConnected` | Yes | No | Yes |
| `condensationGraph` | Yes | No | Yes |
| `bridges` | No | Yes | Yes |
| `articulationPoints` | No | Yes | Yes |
| `biconnectedComponents` | No | Yes | Yes |
| `transitiveReduction` | Yes | No | No, DAG only |
| `dominatorTree` | Yes | No | Yes |

Public types should reject the wrong graph kind. Every implementation must also check `graph.type` and throw a
`GraphError` when an unsafe cast defeats the type restriction. There is no option that silently ignores direction:
weak connectivity is named explicitly, while cut structure is defined only for an undirected graph.

Shared edge-case rules:

- Empty component analyses return `[]`; an edgeless graph has one singleton weak/connected component per node.
- A self-loop is never a bridge and never makes its node an articulation point. It is retained as its own
  edge-bearing biconnected block so every undirected edge belongs to exactly one block.
- Parallel undirected edges are distinct by `EdgeIndex`. In particular, neither of two parallel edges is a bridge;
  the non-parent parallel edge acts as a back edge in low-link analysis. Both belong to the same biconnected block.
- Edge orientation as stored in an undirected graph has no effect. Reversing the stored endpoints produces the same
  node and edge-index results.
- Disconnected graphs are analyzed as forests of DFS roots. Bridges and articulation points are returned across all
  components. Biconnected output includes singleton blocks for isolated nodes.
- Directed self-loops remain inside one SCC, disappear as internal edges in condensation, make transitive reduction
  fail the DAG precondition, and do not change a node's immediate dominator.
- Parallel directed edges do not change weak components, SCCs, or dominance. Their transitive-reduction behavior is
  specified separately below.
- Dominance is rooted reachability. Nodes not reachable from the root are omitted rather than assigned a sentinel
  dominator. Disconnected reachable structure is therefore not possible within one result.

The existing `topo` contract remains directed-only and lazy/repeatable. Empty and disconnected DAGs are valid. Every
parallel edge contributes independently to in-degree, a self-loop is a cycle, configured `initials` must exist and have
zero in-degree, and valid initials are prioritized without omitting other zero-in-degree nodes. Preserve current
`GraphError` messages and the current rule that each fresh iteration observes fresh mutable graph state.

## Public API

Names below follow the existing `Graph` module style. Multi-argument functions use `dual`, supporting both
`operation(graph, ...)` and `graph.pipe(operation(...))`. Unary whole-graph analyses are already naturally pipeable and
must not gain artificial zero-argument overloads. These are synchronous APIs; do not add fake Effect wrappers that
merely defer a synchronous call.

```ts
export interface BiconnectedComponent {
  readonly nodes: ReadonlyArray<NodeIndex>
  readonly edges: ReadonlyArray<EdgeIndex>
}

export interface CondensationResult {
  readonly graph: DirectedGraph<ReadonlyArray<NodeIndex>, ReadonlyArray<EdgeIndex>>
  readonly componentOf: ReadonlyMap<NodeIndex, NodeIndex>
}

export interface DominatorTree {
  readonly root: NodeIndex
  readonly nodes: ReadonlyArray<NodeIndex>
  readonly immediateDominators: ReadonlyMap<NodeIndex, Option.Option<NodeIndex>>
}

export const weaklyConnectedComponents: <N, E>(
  graph: DirectedGraph<N, E> | MutableDirectedGraph<N, E>
) => Array<Array<NodeIndex>>

export const isWeaklyConnected: <N, E>(
  graph: DirectedGraph<N, E> | MutableDirectedGraph<N, E>
) => boolean

export const isStronglyConnected: <N, E>(
  graph: DirectedGraph<N, E> | MutableDirectedGraph<N, E>
) => boolean

export const bridges: <N, E>(
  graph: UndirectedGraph<N, E> | MutableUndirectedGraph<N, E>
) => Array<EdgeIndex>

export const articulationPoints: <N, E>(
  graph: UndirectedGraph<N, E> | MutableUndirectedGraph<N, E>
) => Array<NodeIndex>

export const biconnectedComponents: <N, E>(
  graph: UndirectedGraph<N, E> | MutableUndirectedGraph<N, E>
) => Array<BiconnectedComponent>

export const condensationGraph: <N, E>(
  graph: DirectedGraph<N, E> | MutableDirectedGraph<N, E>
) => CondensationResult

export const transitiveReduction: <N, E>(
  graph: DirectedGraph<N, E> | MutableDirectedGraph<N, E>
) => DirectedGraph<N, E>

export const dominatorTree: {
  <N, E>(
    graph: DirectedGraph<N, E> | MutableDirectedGraph<N, E>,
    root: NodeIndex
  ): DominatorTree
  (root: NodeIndex): <N, E>(
    graph: DirectedGraph<N, E> | MutableDirectedGraph<N, E>
  ) => DominatorTree
}
```

The exact overload formatting should follow neighboring APIs. `Option.none()` represents the root's immediate
dominator; absence from `immediateDominators` represents an unreachable node. `nodes` makes the result's reachable
domain and iteration order explicit.

Do not add `get*` aliases from the reference repository. Do not add generator forms for these APIs: all of them need
global discovery, low-link, closure, or fixpoint state before their results are known, so a generator would be
nominally lazy rather than genuinely lazy.

`isWeaklyConnected` and `isStronglyConnected` are the explicit directed predicates intentionally left out of plan 04's
ambiguous `isConnected` surface. Both return `true` for empty and singleton directed graphs. They may stop once their
answer is known and need not materialize component arrays; `isStronglyConnected` can use one outgoing and one incoming
rooted traversal rather than a full SCC partition.

Do not add a directed `isConnected` overload or alias. Plan 04's `isConnected` is undirected-only; weak and strong
connectivity remain separately named and typed so no two public predicates overlap semantically.

### Biconnected Result

Return vertex-biconnected blocks with their exact edge membership, not only arrays of nodes. Articulation points may
occur in multiple blocks; every non-isolated node occurs in at least one block; every edge occurs in exactly one
block. A bridge is a two-node, one-edge block. An isolated node is a one-node, zero-edge block. A self-loop is a
one-node, one-edge block. This representation supports multigraph consumers and permits all three cut APIs to share
one analysis kernel.

### Condensation Result

Condensation is justified as the bridge between SCC analysis and DAG-only algorithms. Each condensation node stores
the source graph node indexes in its SCC. `componentOf` maps each source `NodeIndex` to the corresponding condensation
graph `NodeIndex`.

The condensation graph is simple even when the source is a multigraph: all source edges crossing the same ordered
component pair become one condensation edge whose data is the source `EdgeIndex` values in stable order. Internal SCC
edges, including self-loops, do not become condensation edges. Empty and disconnected directed graphs are valid; all
SCCs appear, including isolated nodes, and the result is always a DAG.

### Transitive Reduction

The operation returns a new immutable graph and never mutates its input. It retains every node and the original node
data. Surviving edges retain their original `EdgeIndex`, endpoints, and data; removed indexes remain holes and the
next-index counters are preserved. Build this by cloning and removing edges, not by reconstructing a graph with
renumbered indexes.

For each ordered endpoint pair in a DAG:

- If another path of length at least two connects the endpoints, remove every direct parallel edge.
- Otherwise retain only the lowest/insertion-first `EdgeIndex` and remove later parallel edges, because multiplicity
  does not add reachability.

This is the canonical reachability-preserving reduction of the simple relation represented by a directed multigraph.
It is intentionally not an edge-data-preserving optimization. Empty graphs and disconnected DAGs are valid. An
undirected input throws `GraphError("Cannot perform transitive reduction on undirected graph")`; any directed cycle,
including a self-loop, throws `GraphError("Cannot perform transitive reduction on cyclic graph")`. Validate before
constructing the output so failures are atomic.

### Dominator Tree

`dominatorTree(graph, root)` computes immediate dominators in the directed graph rooted at an existing node. A node
`d` dominates `n` when every directed path from `root` to `n` contains `d`. Cycles, back edges, self-loops, and parallel
edges are valid. A missing root throws the existing missing-node `GraphError`; an unsafe undirected input throws a
kind-specific `GraphError`. There is no inferred root: Effect graphs have no initial-node field, and choosing a unique
zero-in-degree node would make disconnected and cyclic behavior surprising.

## Stable Ordering

All new result ordering is part of the contract and is based on stable public indexes, never node or edge data:

- Members of a newly added component result are ascending `NodeIndex`.
- Weak components are ordered by their smallest node index.
- Bridges and articulation points are ascending index.
- Nodes and edges inside each biconnected block are ascending index. Blocks are ordered by smallest node index, then
  smallest edge index, with an edge-less singleton ordered after edge-bearing blocks with the same node.
- Condensation nodes follow the stable order returned by the SCC partition used to construct them; source node lists
  are ascending. Condensation edges follow the first source edge for each component pair, and each edge's source
  index list is ascending.
- `DominatorTree.nodes` and `immediateDominators` iterate reachable nodes in ascending `NodeIndex`.
- Transitive reduction preserves source node and surviving edge iteration order and all sparse indexes.

Before replacing the existing connected-component or SCC internals, add exact-order regression fixtures for their
current outputs, including sparse indexes. Preserve those outputs; do not silently canonicalize an existing API in an
additive plan. New APIs may canonicalize a private copy of an SCC partition where their contracts require it.

Results from mutable graphs describe the graph at call time. They are ordinary snapshots and do not update after a
later mutation.

## Implementation Design

### Shared Undirected Low-Link Kernel

Run one iterative Tarjan-style DFS forest over the direction-ignored ordered arc iterator. Each explicit frame stores
the node, parent `EdgeIndex`, next arc position, DFS child count, and the edge that entered the frame. Dense arrays hold
discovery time, low-link value, parent edge, and flags; an edge stack identifies biconnected blocks.

Parent suppression must compare `EdgeIndex`, not parent node. This is the key multigraph rule: a second parallel edge
to the parent remains visible and lowers the child's low-link. Push each tree edge once and each ancestor back edge
once. Handle a self-loop once by edge identity and emit it as a standalone block without changing low-link values.
On frame completion:

- `low[child] > discovery[parent]` marks the entering edge as a bridge.
- `low[child] >= discovery[parent]` closes one biconnected block at the entering edge.
- A non-root parent meeting that boundary is an articulation point.
- A DFS root is an articulation point exactly when it has more than one DFS-tree child.

Start roots in node-index order and continue across disconnected components. Emit an isolated singleton after
finishing a root with no incident non-loop edge and no loop block. Normalize public output once after analysis rather
than adding ordered-set costs to the hot loop. `bridges`, `articulationPoints`, and `biconnectedComponents` should all
delegate to this one internal result.

### Weak and Strong Components

`weaklyConnectedComponents` performs iterative BFS/DFS across direction-ignored arcs. Mark nodes when enqueued so
parallel edges and self-loops do not duplicate work. The existing undirected `connectedComponents` can share this
kernel only if exact-order regression tests prove no public ordering change.

Keep the existing directed-only SCC semantics. Its iterative Kosaraju implementation may move onto dense arrays and
ordered incoming/outgoing arcs, or be replaced by an iterative Tarjan SCC kernel, only after exact-order tests pin the
current API. Condensation must consume one computed SCC partition and must not rerun SCC discovery per edge.

Implement `isWeaklyConnected` as one direction-ignored traversal with early count comparison. Implement
`isStronglyConnected` as outgoing and incoming traversals from the first node; reaching every node in both directions
is equivalent to strong connectivity and avoids materializing SCC arrays. Both use the vacuous empty-graph convention.

### Topological Ordering

Retain `topo` as the public lazy `NodeWalker`; do not add an eager alias because callers can collect `Graph.indices` or
`Graph.values`. Move its Kahn state onto the shared FIFO and ordered outgoing arc kernel while preserving exact enqueue
order, `initials` priority, validation timing, repeatability, and mutable-state behavior. Count every parallel edge when
initializing and decrementing in-degree. DAG consumers in this plan may use a private eager node-index projection of the
same kernel, but must not collect node data or create a second tie-order rule.

### Condensation

Allocate one condensation node per SCC and a dense `componentOf` table/map. Scan original edges once in edge-index
order. Ignore edges whose endpoints map to the same component; for crossing edges, group by the ordered component
pair and append the source edge index. Add grouped edges in the order their pair is first encountered. Assert in tests,
not production hot code, that the result is acyclic.

### Transitive Reduction

Validate graph kind and acyclicity, then obtain one stable topological order. On a dense snapshot, compute a reverse-
topological reachability bitset for each node by OR-ing successor bitsets and setting successor bits. For each source,
consider distinct successor nodes in ascending topological rank. A successor already covered by an earlier
successor's reachability is redundant; otherwise retain its first edge and union its closure into the covered set.
This ordering is valid because a later topological successor cannot reach an earlier one. Remove all redundant edges
from a cloned graph in one mutation scope.

Use packed typed-array bitsets from the dense kernel rather than nested JavaScript `Set`s. If the dense plan defines a
memory threshold, provide a stack-safe repeated-search fallback with identical output rather than allocating
quadratic memory unconditionally.

### Dominators

Use the Cooper-Harvey-Kennedy iterative algorithm initially: it is compact, well understood, and fast for typical
control-flow graphs. Build reverse postorder of the root-reachable subgraph with explicit DFS frames, build reachable
predecessor lists from incoming arcs, and iterate immediate dominators to a fixpoint. `intersect` walks the current
dominator chains by reverse-postorder number. No recursive DFS is permitted.

Check the shared synchronous checkpoint once per DFS batch and once per fixpoint sweep. Do not adopt the substantially
more complex Lengauer-Tarjan algorithm without benchmark evidence that CHK is a bottleneck. The public result is
materialized in stable node-index order after the fixpoint, independent of internal reverse-postorder order.

## Complexity

Let `V` be nodes, `E` be edge occurrences including parallel edges and loops, `C` be SCCs, and `W` be the machine-word
width used by packed bitsets.

| Operation | Time | Additional space |
| --- | --- | --- |
| Weak/connected components | `O(V + E)` | `O(V)` |
| Weak/strong connectivity predicates | `O(V + E)` | `O(V)` |
| Strongly connected components | `O(V + E)` | `O(V)` plus DFS frames |
| Topological ordering | `O(V + E)` | `O(V)` plus lazy walker state |
| Bridges/articulation/biconnected blocks | `O(V + E)` before output normalization | `O(V + E)` |
| Condensation | `O(V + E)` expected, plus stable normalization | `O(V + E)` including grouped source edges |
| Transitive reduction, bitset path | `O((V + E) * ceil(V / W) + E log E)` | `O(V * ceil(V / W) + E)` |
| Transitive reduction fallback | `O(VE)` worst case | `O(V + E)` |
| Dominator tree (CHK) | `O(I * (V + E))`, worst-case `O(VE)` | `O(V + E)` |

Document these bounds in public JSDoc, including the potentially quadratic transitive-closure storage and CHK's
fixpoint behavior. Sorting terms are over stable index normalization and per-source successor ordering; they must not
hide repeated graph scans.

## Errors and Validation

- Reuse `GraphError`; do not introduce one error class per algorithm.
- Wrong-kind errors are synchronous and occur before traversal.
- `topo` and `transitiveReduction` distinguish wrong kind from cyclic directed input. Reduction performs no partial
  mutation; `topo` preserves its existing walker-time validation behavior.
- `dominatorTree` validates kind before root existence, then uses the shared missing-node error for the root.
- Component and cut analyses have no failure for empty, disconnected, loopy, or parallel-edge graphs of the correct
  kind.
- Condensation is defined for every directed graph and therefore has no DAG precondition.
- Do not catch internal invariant violations and return partial results. Dense/arc snapshots should guarantee that
  every retained edge endpoint maps to a retained node.

## Tests

Add focused unit tests in `packages/effect/test/Graph.test.ts` or a dedicated graph algorithm test file if plan 02 has
split the suite. Use `assert` from `@effect/vitest` and shared seeded fixtures/oracle adapters.

### Example Fixtures

- Triangle joined by one bridge to another triangle: one bridge, two articulation points, and three biconnected
  blocks including the bridge block.
- DFS-root path fixture with node order chosen so the root has two children, preventing the common root-articulation
  and block-merging bug.
- Reversed-storage undirected path, disconnected cycles, isolated nodes, an isolated self-loop, two and three parallel
  edges, and a parallel pair plus a true bridge.
- Directed chain, diamond, nested diamond, separate cycles with a tail, isolated directed nodes, SCC-to-SCC parallel
  edges, and sparse node/edge indexes after deletion.
- Transitive-reduction chain, triangle shortcut, diamond shortcut, disconnected DAG, empty DAG, duplicate direct
  edges, direct parallels plus a length-two alternative, self-loop, and multi-node cycle.
- Dominator chain, diamond, nested diamond, loop back-edge, unreachable island, parallel edges, self-loop, missing
  root, and the Cooper-Harvey-Kennedy paper fixture.

Every new API needs direct and piped-call tests, mutable and immutable inputs, wrong-kind runtime tests through an
unsafe cast, exact stable-order assertions, and empty/singleton coverage. The multi-argument `dominatorTree` additionally
needs both dual forms; unary whole-graph analyses do not use a zero-argument overload.

### Oracles

- On small seeded undirected multigraphs, brute-force bridges by removing one `EdgeIndex` and comparing connected-
  component counts; brute-force articulation points by removing one node and its incident edges.
- Compare cut vertices, bridges, and normalized edge-bearing blocks on simple graphs with a trusted adapter such as
  Graphology or NetworkX. Keep multigraph self-loop and parallel-edge semantics in local hand-checked oracles if the
  external library differs.
- For small directed graphs, derive SCC equivalence from mutual `hasPath`; derive weak components from a disjoint-set
  union over all edge endpoints.
- Compare DAG transitive reduction with a trusted oracle on simple DAGs. For multigraphs, compare against a local
  endpoint-relation oracle because most libraries discard edge identity.
- For small rooted directed graphs, enumerate bounded simple root-to-node paths and intersect their node sets to
  establish dominance, then select the closest strict dominator. Pin the paper example independently.

### Properties

- Removing a reported bridge increases the graph's component count by one; removing a non-bridge does not.
- Removing an articulation point increases component count relative to removing a non-cut vertex under the standard
  disconnected-graph definition.
- Every undirected edge belongs to exactly one biconnected block; block intersections larger than one node are
  impossible; a node shared by multiple non-loop blocks is an articulation point.
- Reversing every stored undirected edge endpoint leaves normalized cut results unchanged.
- SCCs and weak components partition all nodes exactly once. Every SCC is internally mutually reachable.
- `isWeaklyConnected` agrees with weak component count under the empty convention; `isStronglyConnected` agrees with SCC
  count and is invariant under reversing every directed edge.
- Condensation is acyclic, contains exactly one node per SCC, and represents every crossing source edge exactly once
  in one grouped edge. Condensing a DAG yields singleton SCC nodes.
- Transitive reduction preserves reachability for every node pair, is idempotent, and is minimal over endpoint pairs:
  removing any surviving representative changes reachability.
- Every immediate dominator dominates its node; repeatedly following immediate dominators reaches the root without a
  cycle; unreachable nodes are absent; the root alone maps to `Option.none()`.
- Results are invariant under node/edge payload changes and deterministic across repeated calls.

### Stack Safety and Scale

Add non-recursion regressions for a long undirected path, a long directed SCC/chain, a long DAG reduction fallback,
and a long dominator chain. Sizes should exceed typical JavaScript recursion limits while remaining suitable for a
targeted test. Benchmarks should cover sparse large graphs, dense DAGs near the bitset threshold, parallel-edge-heavy
undirected graphs, and dominator graphs requiring multiple CHK sweeps.

### Type Tests

Extend `packages/effect/typetest/Graph.tst.ts` to prove that directed-only and undirected-only analyses reject the wrong
kind and a non-narrowed `Kind`, matching mutable graphs are accepted, unary results remain pipeable, both
`dominatorTree` dual forms infer `N` and `E`, and the three result models expose readonly node/edge/map members with the
declared graph kind. Verify that `transitiveReduction` preserves `N` and `E` and returns a directed immutable graph.

## Dependencies and Ownership

This plan requires:

- Plans 01 and 02 for corrected multigraph contracts, seeded fixtures, differential adapters, and benchmark gates.
- Plan 03's ordered arc iterator retaining `EdgeIndex`. Cut analysis cannot be correct on parallel undirected edges
  if it traverses only unique neighbor nodes.
- Plan 03's optional dense snapshot and packed-bitset policy for low-allocation arrays and transitive reduction.
- Plan 04's graph-clone/filter transform that preserves sparse node/edge indexes and counters. If it does not expose
  one, add only the minimum internal helper needed by transitive reduction rather than rebuilding public indexes.
- Plan 04's `hasPath` only as a test oracle; production component, reduction, and dominator kernels must not perform
  repeated public path queries.
- The established `isAcyclic` contract from plans 01 and 05 for DAG validation. This plan owns stable topological
  ordering; cycle details and enumeration remain owned by plan 05.

The shared predecessor/path reconstruction kernel is not needed for public results in this plan. Dominator
predecessor lists are structural incoming arcs, not shortest-path predecessors, and should use the arc/dense kernels
directly. The no-op checkpoint belongs to shared groundwork; this plan places checkpoints but does not expose
Effect-returning variants.

Work that can proceed independently after the arc kernel exists:

- Weak components and iterative undirected low-link analysis.
- Dominator-tree implementation and its brute-force oracle.
- API models, ordering fixtures, and wrong-kind tests.

Condensation waits for the SCC ordering baseline. Transitive reduction waits for this plan's stable topological kernel,
dense bitsets, and an index-preserving clone/filter path.

## Delivery Sequence

1. Pin current component/SCC/topological ordering and errors, including sparse indexes, parallel in-degree, and mutable
   walker snapshots.
2. Add weak components and the shared iterative undirected low-link kernel; expose bridges, articulation points, and
   edge-aware biconnected components.
3. Add condensation on one SCC pass and verify its DAG and crossing-edge invariants.
4. Add DAG validation and index-preserving transitive reduction with bitset and bounded-memory paths.
5. Add iterative CHK dominance with stable materialization and checkpoint calls.
6. Run targeted unit, property, oracle, stack-safety, lint, type, and benchmark checks; add the required `effect`
   changeset for the exported APIs.

The plan is complete when every API has an explicit kind/error contract, all multigraph and self-loop properties pass,
no implementation relies on the JavaScript call stack, reductions preserve reachability and public indexes, and no
function or test duplicates the plan 04 basic queries or plan 05 cycle enumeration.
