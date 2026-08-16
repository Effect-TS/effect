# Core Queries and Transforms

## Goal

Add the small, conventional structural queries and subgraph transforms that applications otherwise have to rebuild
from `nodes`, `edges`, `neighbors`, and traversal APIs. The additions must preserve the current graph model: stable
numeric indexes, directedness in the type, parallel edges, self-loops, deterministic index order, scoped mutation,
and lazy `Walker` iteration.

This is an additive plan. Existing APIs and behavior, including `neighbors`, `successors`, `predecessors`,
`neighborsDirected`, `externals`, `neighborhood`, mutable transforms, and set operations, remain unchanged.

## Scope

### In scope

- Lazy incident, incoming, and outgoing edge walkers.
- Degree, in-degree, and out-degree.
- All edge occurrences between two nodes.
- Reachability, undirected connectivity, and undirected tree predicates.
- General index-preserving induced-subgraph transforms.
- Immutable and mutable graph reads for every query.
- Shared internal reuse needed to make these APIs consistent and efficient.

### Out of scope

- Graph generators such as complete, grid, random, Watts-Strogatz, and Barabasi-Albert graphs. Those are analytics
  and fixture-building features owned by plan 09. This plan only defines the query and transform primitives that
  plan 09 may use in generator tests.
- Directed arborescence, weak/strong directed connectivity predicates, spanning trees, transitive closure, path
  enumeration, line graphs, graph flattening, and hierarchy-specific transforms.
- Renaming or replacing current APIs to match `.repos/graph`'s `get*` convention.
- Convenience aliases that do not add a distinct semantic or type-level guarantee.

## Current State and Reference Lessons

`Graph.ts` already stores ordered node and edge maps plus outgoing and reverse adjacency arrays. It exposes eager
neighbor arrays, lazy whole-graph `NodeWalker` / `EdgeWalker` values, directed `successors` and `predecessors`, and
the configurable `externals` walker. Queries generally accept both `Graph` and `MutableGraph`; missing safe lookups
use `Option`, collection queries are empty when no result exists, and `hasEdge` returns `false` for missing nodes.

The reference implementation in `.repos/graph/src/queries.ts` demonstrates the usefulness of incident/in/out edge
queries, degree variants, `edgesBetween`, and explicit sources/sinks. `.repos/graph/src/transforms.ts` demonstrates
an induced subgraph, and `.repos/graph/src/algorithms/traversal.ts` demonstrates the value of small `hasPath`,
`isConnected`, and `isTree` predicates. We should adopt those capabilities, not its naming, JSON identity model,
mixed edge modes, hierarchy behavior, or eager-array bias.

The reference also contains generators in `.repos/graph/src/generators.ts`. They do not belong in core queries and
transforms. Plan 09 should own their API, randomness policy, validation, fixtures, and changesets; this plan should
not introduce generator names or helper types that constrain that work.

## Semantic Decisions

### Edge occurrence and ordering

- `incidentEdges` yields each stored edge incident to the node exactly once. A directed or undirected self-loop is
  one stored edge occurrence and is yielded once, even though internal adjacency may register it in more than one
  endpoint/direction slot.
- Parallel edges are never deduplicated. Every distinct `EdgeIndex` is yielded.
- `inEdges` and `outEdges` use authored direction and are directed-only at the type level. A directed self-loop is
  present once in each walker.
- `edgesBetween(source, target)` yields every matching edge in edge-index/insertion order. Directed graphs match
  exactly `source -> target`; undirected graphs match either stored endpoint orientation. A self query matches all
  self-loops at that node once each.
- All new edge walkers follow `EdgeWalker` conventions: repeatable, genuinely lazy, copy `Edge` values before
  exposing them, skip entries removed before they are read, and create fresh iterator state for each iteration.
- Ordering is global edge insertion/index order, not “outgoing first, then incoming”. The internal ordered arc/edge
  kernel should merge or scan indexes without changing this observable order.

### Degree

- Directed `inDegree` is the count of incoming edge occurrences and `outDegree` is the count of outgoing edge
  occurrences. A directed self-loop contributes one to each.
- Directed `degree` is `inDegree + outDegree`; therefore a self-loop contributes two.
- Undirected `degree` is graph-theoretic degree. Every parallel edge contributes independently and every self-loop
  contributes two.
- `inDegree` and `outDegree` are directed-only. Defining them for undirected graphs would create duplicate names for
  `degree` without useful semantics.
- A missing node has degree `0`, matching empty adjacency and the safe behavior of `hasEdge` and collection queries.
- Complexity is `O(1)` using validated adjacency lengths. Do not implement degree by collecting a walker.

### Reachability and structural predicates

- `hasPath(source, target)` follows outgoing arcs in directed graphs and either endpoint direction in undirected
  graphs. It is reflexive only for an existing node: `hasPath(graph, n, n)` is `true` when `n` exists and `false`
  when it does not.
- Missing source or target nodes return `false`; a boolean query should not require an `Option` wrapper or throw for
  ordinary absence.
- `isConnected` is restricted to undirected graphs. Naming a directed graph “connected” is ambiguous between weak
  and strong connectivity; those explicit directed concepts belong to the connectivity plan.
- Plan 06 must not add a directed overload or alias named `isConnected`. It owns only explicitly named
  `isWeaklyConnected` and `isStronglyConnected`; the three predicates have distinct, non-overlapping graph-kind domains.
- The empty undirected graph and a one-node undirected graph are connected. This preserves the useful vacuous
  convention and matches the reference behavior.
- `isTree` is restricted to undirected graphs and means connected and acyclic. Empty and singleton graphs are
  trees. A self-loop prevents tree status, and two parallel edges between the same endpoints form a cycle and
  prevent tree status.
- `isTree` may use the `|E| = |V| - 1` fast rejection, but correctness must ultimately follow the shared multigraph
  cycle and connectivity contracts. Do not infer acyclicity from edge count alone.

### Sources, sinks, and `externals`

- Do not add `sources` or `sinks`; `externals(config?)` already provides this capability and the plan rejects convenience
  aliases without distinct semantics.
- Do not add `initials`, `terminals`, `roots`, `leaves`, `boundaryNodes`, or eager source/sink array aliases.

### Missing nodes and empty results

- Edge walkers for a missing node, and `edgesBetween` with either endpoint missing, are empty.
- Degree variants return `0` for a missing node.
- `hasPath` returns `false` if either endpoint is missing.
- These APIs do not need `Option`: none returns a single optional value. Existing single-value lookups continue to
  use `getNode` / `getEdge` and `Option.none`.
- Subgraph selectors are different: a requested missing index is invalid structural input and throws `GraphError`.
  Empty selector iterables are valid and produce an empty graph.

### Subgraph identity and directedness

- Both transforms preserve `T extends Kind` exactly.
- Surviving nodes and edges retain their original `NodeIndex` and `EdgeIndex`; transforms must not compact or
  renumber public identifiers. The next node and edge allocators also remain monotonic relative to the input so a
  later mutation cannot reuse removed identifiers.
- Node and edge iteration order remains the input graph's index/insertion order, regardless of selector iterable
  order. Duplicate selector indexes are ignored.
- `inducedSubgraph(nodes)` keeps exactly the selected nodes and every original edge whose two endpoints are selected.
- The internal selected-structure copier can keep exactly selected nodes and edge occurrences. Every selected edge must
   exist and both endpoints must be selected; otherwise it throws `GraphError` rather than silently changing the
   request. Parallel edges and self-loops are selected independently by `EdgeIndex`.
- Both transforms accept immutable or mutable input as a read and always return a new immutable `Graph`. They take a
  synchronous snapshot during the call; later mutation of the source does not affect the result.
- Empty node selection produces an empty graph.
- These are structural selection operations, not graph set operations: they select by stable indexes and do not use
  `IdentityOptions`, coalesce equal data, or compare another graph.
- `neighborhood` remains unchanged, including its current index-allocation behavior. It may only be rewritten to use
  the new induced-subgraph kernel if regression tests prove all existing observable behavior remains identical.

## Proposed API

Signatures are illustrative; implementation should match the repository's overload formatting and `dual` style.

```ts
export const incidentEdges: {
  (nodeIndex: NodeIndex): <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => EdgeWalker<E>
  <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>,
    nodeIndex: NodeIndex
  ): EdgeWalker<E>
}

export const inEdges: {
  (nodeIndex: NodeIndex): <N, E>(
    self: DirectedGraph<N, E> | MutableDirectedGraph<N, E>
  ) => EdgeWalker<E>
  <N, E>(
    self: DirectedGraph<N, E> | MutableDirectedGraph<N, E>,
    nodeIndex: NodeIndex
  ): EdgeWalker<E>
}

export const outEdges: typeof inEdges

export const edgesBetween: {
  (source: NodeIndex, target: NodeIndex): <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => EdgeWalker<E>
  <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>,
    source: NodeIndex,
    target: NodeIndex
  ): EdgeWalker<E>
}

export const degree: {
  (nodeIndex: NodeIndex): <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => number
  <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>,
    nodeIndex: NodeIndex
  ): number
}

export const inDegree: {
  (nodeIndex: NodeIndex): <N, E>(
    self: DirectedGraph<N, E> | MutableDirectedGraph<N, E>
  ) => number
  <N, E>(
    self: DirectedGraph<N, E> | MutableDirectedGraph<N, E>,
    nodeIndex: NodeIndex
  ): number
}

export const outDegree: typeof inDegree

export const hasPath: {
  (source: NodeIndex, target: NodeIndex): <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => boolean
  <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>,
    source: NodeIndex,
    target: NodeIndex
  ): boolean
}

export const isConnected: <N, E>(
  self: UndirectedGraph<N, E> | MutableUndirectedGraph<N, E>
) => boolean

export const isTree: <N, E>(
  self: UndirectedGraph<N, E> | MutableUndirectedGraph<N, E>
) => boolean

export const inducedSubgraph: {
  (nodes: Iterable<NodeIndex>): <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>
  ) => Graph<N, E, T>
  <N, E, T extends Kind>(
    self: Graph<N, E, T> | MutableGraph<N, E, T>,
    nodes: Iterable<NodeIndex>
  ): Graph<N, E, T>
}
```

Use normal overloads rather than `typeof` aliases in the actual source if `typeof` degrades generated API docs or
parameter names. All multi-argument functions use both data-first and data-last forms. Unary whole-graph queries
(`isConnected`, `isTree`) need no artificial zero-argument dual form.

## Complexity Targets

Let `V` and `E` be graph sizes, `deg(v)` the incident edge occurrences at `v`, and `k` the number of selected items.

| API | Time | Additional space | Notes |
| --- | ---: | ---: | --- |
| `inEdges`, `outEdges` | `O(deg(v))` consumed | `O(1)` iterator state | Lazy; early termination is proportional to consumed edges. |
| `incidentEdges` | `O(deg(v))` consumed | `O(deg(v))` worst case | Dedupe self-loop registrations by edge index while preserving parallel edges. |
| `edgesBetween` | `O(min(outDegree(source), inDegree(target)))` where supported, otherwise `O(deg(source))` | `O(1)` or dedupe state | Preserve edge-index order. |
| `degree`, `inDegree`, `outDegree` | `O(1)` | `O(1)` | Depends on correct adjacency accounting. |
| `hasPath` | `O(V + E)` worst case | `O(V)` | Stop immediately when target is found. |
| `isConnected` | `O(V + E)` | `O(V)` | One direction-ignored traversal. |
| `isTree` | `O(V + E)` | `O(V)` | Edge-count fast rejection plus connectivity/cycle contract. |
| `inducedSubgraph` | `O(V + E + k)` | `O(V + E)` result | Scan source order after validating selection. |

Do not sacrifice deterministic order for a nominally tighter bound. The internal kernel may improve
`edgesBetween` with ordered adjacency intersections, but a source-order scan is acceptable initially if benchmark
evidence does not justify more indexing.

## Implementation Reuse

The implementation should be thin wrappers over shared internals rather than another adjacency interpretation.

1. Use the ordered arc iterator owned by the internal-kernel plan for outgoing, incoming, and direction-ignored
   traversal. It must retain `EdgeIndex`, distinguish authored direction, normalize undirected endpoints, and handle
   undirected self-loop double registration correctly.
2. Build `inEdges`, `outEdges`, `incidentEdges`, `edgesBetween`, neighbor queries, and `hasPath` on that kernel.
   Existing neighbor and traversal code should migrate only where tests prove no ordering or mutation regression.
3. Implement degree from adjacency counts after the correctness plan establishes exact self-loop registration
   invariants. Directed degree is the sum of the two lists; undirected degree uses graph-theoretic endpoint count.
4. Add one internal “copy selected structure” helper that copies maps, adjacency, reverse adjacency, graph kind,
   allocator counters, and safe acyclic-cache state while retaining public indexes. Coordinate this representation
   with schema snapshot/hydration work; do not create a second serialized graph model.
5. `inducedSubgraph` computes the edge selection then delegates to the private selected-structure copier. Keep explicit
   edge-selected subgraphs internal until a separately approved public use appears.
6. `hasPath` may use a small queue/stack directly over ordered arcs. Do not collect `bfs`, because current `bfs`
   throws for missing starts and exposes node values that this boolean query does not need.
7. `isConnected` should perform one undirected traversal from the first node and compare visited count. `isTree`
   should reuse `isConnected` and the corrected multigraph-aware acyclicity kernel rather than duplicate DFS logic.

Mutable reads must not call `endMutation`, clone the source, or invalidate the mutation scope. Lazy walkers read the
graph when each iterator runs, consistent with current `Walker` behavior. Snapshot-returning transforms read the
current mutable state once and return an independent immutable graph.

## Dependency and Ownership

### Required earlier work

- **Plan 01, correctness contracts:** adjacency and reverse-adjacency invariants, undirected self-loop registration,
  parallel-edge handling, stable iteration order, mutable walker behavior, and multigraph cycle semantics must be
  locked by regression tests first.
- **Plan 03, internal architecture/performance kernel:** provide the ordered arc iterator and a selection/snapshot
  helper capable of preserving sparse stable indexes and allocator counters. This plan must not introduce competing
  arc or dense-index representations.

### Work that can proceed independently

- Public signatures, JSDoc, type tests, missing/empty behavior tests, and source/sink delegation can be prepared once
  correctness contracts are agreed.
- Subgraph selector validation and API tests can proceed against a simple source-order implementation before any
  dense snapshot optimization.
- Generator work in plan 09 is independent and should only consume released APIs, not block them.

### APIs owned here

This plan owns the public APIs listed above and only their lightweight kernels. The traversal/path plan owns richer
traversal configuration and path values. The connectivity plan owns weak/strong directed connectivity, bridges,
articulation points, and component APIs. Plan 08 owns analytics and plan 09 owns generators. If those plans need the same arc or
snapshot primitive, ownership stays with the internal-kernel plan.

## Phased Delivery

1. **Correctness and kernel prerequisites**
   - Lock adjacency, self-loop, parallel-edge, sparse-index, ordering, and mutable-iteration behavior.
   - Land the shared ordered arc iterator and selected-structure copy helper.
   - Verify against seeded and hand-built multigraph fixtures before exposing APIs.
2. **Local edge and degree queries**
   - Add `inEdges`, `outEdges`, `incidentEdges`, `edgesBetween`, `degree`, `inDegree`, and `outDegree`.
   - Reuse internals without changing existing neighbor APIs.
   - Benchmark high-degree nodes and parallel/self-loop-heavy fixtures.
3. **Subgraph transforms**
   - Add the private selected-structure copier and public `inducedSubgraph` with stable-index/allocator preservation.
   - Verify result independence and all directed/undirected multigraph cases.
4. **Structural predicates**
   - Add `hasPath`, undirected-only `isConnected`, and undirected-only `isTree` after the ordered traversal and cycle
     kernels are stable.
   - Differentially verify against simple test oracles.
5. **Documentation and release completion**
   - Finish JSDoc examples, API grouping, type tests, complexity notes, and changesets.
   - Coordinate references from traversal, connectivity, analytics/generator, and consolidated graph docs.

Each phase may ship independently; do not hold basic local queries for plan 09 generator work.

## Verification Matrix

### Runtime tests

Add focused tests in `packages/effect/test/Graph.test.ts` or split a dedicated graph-query test file if the repository
has done so by implementation time. Cover at least:

- Empty, singleton, disconnected, path, cycle, and branching graphs for both kinds where accepted.
- Sparse node and edge indexes after removals; returned walkers and subgraphs retain original indexes and order.
- Directed incoming/outgoing distinction, reverse-direction `edgesBetween`, and data-first/data-last parity.
- Missing node behavior for every local query and both missing endpoints for `hasPath` / `edgesBetween`.
- Parallel edges with equal and unequal data remain separate and ordered in every edge walker and subgraph.
- Directed self-loop: once in each directional walker, once in incident/between walkers, in/out degree one, total
  degree two, reflexive path true, and not a relevant undirected tree case.
- Undirected self-loop: once in incident/between walkers, degree two, cycle present, and `isTree` false.
- Two parallel undirected edges form a cycle and make `isTree` false; one edge between two nodes is a tree.
- `hasPath`: directionality, undirected symmetry, early success, reflexive existing node, reflexive missing node,
  disconnected target, self-loop, and parallel-edge paths.
- `isConnected`: empty and singleton true, isolated node in a larger graph false, disconnected components false.
- `isTree`: empty/singleton true, path true, disconnected forest false, cycle false, loop false, parallel-edge cycle
  false.
- Induced subgraphs include all and only edges with both endpoints selected, including parallel edges and loops.
- Induced subgraphs preserve kind, node/edge data, sparse indexes, allocator monotonicity, insertion order, and source
  independence after subsequent mutation.
- All read queries work on `MutableGraph` during construction and manual mutation scopes without ending the scope.
- Walker repeatability, partial consumption, removal before read, additions before a fresh iteration, and copied edge
  values follow existing `Walker` tests.

Use seeded fixtures and oracle adapters from the verification foundation for randomized checks:

- `degree(v)` equals endpoint incidence count, with undirected loops counted twice.
- `edgesBetween(a, b)` equals filtering all edges under kind-specific endpoint rules.
- `hasPath(a, b)` agrees with a simple reference BFS and, when available, path-result presence.
- `isConnected` agrees with component count under the documented empty-graph convention.
- `isTree` agrees with connected plus multigraph-aware acyclic.
- Induced subgraphs contain exactly the selected node set and all valid endpoint-closed edges.

### Type tests

Extend `packages/effect/typetest/Graph.tst.ts` to prove:

- Every multi-argument API infers node data, edge data, and kind in both dual forms and through `pipe`.
- Edge queries return `EdgeWalker<E>` and transforms preserve exact `T`.
- Every read query accepts the matching mutable graph type.
- `inEdges`, `outEdges`, `inDegree`, and `outDegree` reject undirected and unknown-kind graphs
  until narrowed to directed.
- `isConnected` and `isTree` reject directed and unknown-kind graphs until narrowed to undirected.
- `degree`, `incidentEdges`, `edgesBetween`, `hasPath`, and `inducedSubgraph` accept either known kind and a
  narrowed `Kind` graph.
- Selector iterables accept arrays, sets, and walker-derived `Iterable` values without widening result data types.

### Documentation

- Add full public JSDoc with `@since`, categories, complexity, missing-node behavior, directedness, ordering,
  self-loop/parallel-edge semantics, mutable-read support, and runnable examples.
- Cross-link directional pairs, `incidentEdges` to `edges`, and `inducedSubgraph` to `neighborhood`.
- Document why `isConnected` / `isTree` are undirected-only and point directed users to explicit connectivity APIs.
- Show `Array.from(Graph.indices(...))` / `Graph.values(...)` for walkers rather than presenting them as arrays.
- Update consolidated graph documentation and API inventories when their owning plan lands.
- Run `pnpm lint`, targeted doctests for `packages/effect/src/Graph.ts`, and documentation link checks.

### Validation commands

For each implementation phase, run the narrowest applicable checks:

```sh
pnpm lint-fix
pnpm --filter effect test --run test/Graph.test.ts
pnpm test-types Graph.tst.ts
pnpm doctest --run packages/effect/src/Graph.ts
pnpm check
```

Add focused benchmark commands from the verification plan for high-degree edge queries, repeated degree reads,
reachability early exit, and large subgraph selection. Never use benchmark improvements to relax semantic tests.

## Changesets

Every phase that exports one or more APIs requires an `effect` minor changeset because it adds public API. If the
work is released in multiple phases, use one changeset per independently released API group and describe semantics,
not internal implementation. Internal-kernel-only preparation needs no changeset. Plan 09 must provide separate
changesets for generators; no generator should be mentioned in this plan's release note except as explicitly out of
scope.

## Acceptance Criteria

- All proposed APIs are additive, follow Effect naming/dual/Walker conventions, and preserve exact graph kind.
- Query behavior is fully specified for missing nodes, empty graphs, mutable reads, ordering, self-loops, and
  parallel edges.
- Directedness-ambiguous APIs are prevented by types rather than assigned undocumented weak/strong semantics.
- Subgraphs retain surviving public indexes and allocator monotonicity and never collapse edge occurrences.
- Existing `externals`, neighbor, traversal, set-operation, neighborhood, and mutable-transform behavior is unchanged.
- Runtime, property/differential, type, doctest, lint, and targeted performance verification pass.
- Generator ownership is left to plan 09 with no duplicate API or helper surface introduced here.
