# Graph algorithm scope review

Reviewed against:

- Effect `packages/effect/src/Graph.ts` at repository commit `397bf1ebd9`.
- `@statelyai/graph` in `.repos/graph` at repository commit `7b5ac38` (package version `2.1.0`).

## Scope

This review inventories graph-theoretic algorithms, traversal and walk mechanisms, path utilities, algorithm-enabling queries, graph generators, and structural transforms. It excludes serialization formats, diff/patch utilities, schema validation, and third-party visual layout engines. Those are substantial parts of Stately's package, but they are not candidates for the core algorithm surface of Effect's `Graph` module.

The recommendation labels mean:

- **Existing**: Effect already has the capability, possibly with different semantics.
- **Add next**: common, broadly useful, and a good fit for the core module.
- **Later / optional**: legitimate graph functionality, but specialized enough to follow the core additions or live in a separate module.
- **Do not add**: too domain-specific, too policy-heavy, or redundant with simpler composition.

## Executive recommendation

Effect should not target feature parity with Stately. Stately is both a graph kernel and a graph-analysis/model-based-testing toolkit. Effect should first complete the smaller, conventional graph core around its already strong immutable representation and traversal machinery.

### Add next

1. Basic structural queries: incident/in/out edges, `degree`, `inDegree`, `outDegree`, unweighted distances, `hasPath`, `isConnected`, and `isTree`.
2. Weak connectivity for directed graphs, either by widening `connectedComponents` or adding an explicitly named `weaklyConnectedComponents`.
3. A shared edge-identifying path model, including `EdgeIndex[]`, before adding more path-producing algorithms.
4. Lazy all-tied shortest paths and lazy simple paths, with explicit result limits where output can be exponential.
5. `minimumSpanningForest` for undirected graphs. "Forest" is the accurate total operation for disconnected input.
6. `findCycle` as a cheap cycle witness, followed by lazy `cycles` only if complete enumeration has demonstrated demand.
7. `inducedSubgraph` with explicit index-preservation semantics.
8. `transitiveReduction` for directed acyclic graphs.

### Add later or as an optional analysis layer

- Bridges, articulation points, biconnected components, Eulerian paths/circuits, k-shortest loopless paths, maximum flow/minimum cut, bipartite matching, dominators, graph coloring, planarity, isomorphism, k-cores, and selected centrality measures.
- Centrality and community-detection families should be added together, if at all, rather than piecemeal. They form a coherent analytics surface with convergence, normalization, weighting, and cancellation concerns.
- Random walks should require explicit randomness or use an Effect service. A pure API that silently calls `Math.random` would not fit Effect conventions.

### Do not add to the core module

- Enumeration of every possible DFS ordering.
- Path-coverage planning and walk-coverage stop wrappers, which are model-based-testing utilities rather than graph primitives.
- Approximate TSP and Steiner-tree solvers without a separate approximation/optimization API and explicit guarantees.
- Hierarchical-statechart flattening, which depends on Stately-specific parent/initial-node fields.
- Seeded synthetic graph generators as production `Graph` APIs. They are better test/benchmark utilities.

## Model differences that affect ports

| Concern             | Effect `Graph`                                                                    | Stately graph                                                             | Consequence                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity            | Stable numeric node and edge indexes                                              | String IDs on JSON objects                                                | Effect results should return indexes, not copied payloads, when exact identity matters.                                                                            |
| Direction           | One graph-level kind: directed or undirected                                      | Directed, undirected, or bidirectional graph mode plus per-edge overrides | Mixed-mode Stately implementations cannot be ported directly. Effect APIs can use narrower, clearer kind constraints.                                              |
| Mutation            | Immutable graph plus scoped mutable graph                                         | Plain mutable JSON graph plus immutable convenience copies                | Effect algorithms should remain queries or return immutable results/index sets.                                                                                    |
| Parallel edges      | Supported and separately indexed                                                  | Supported and separately identified                                       | Paths, cycles, trails, matching, and flow must identify the actual edge used.                                                                                      |
| Current path result | Node indexes plus distance and edge payloads (`costs`)                            | Source node plus edge-and-node steps                                      | `PathResult.costs` is ambiguous when parallel edges have equal payloads. Add `edges: Array<EdgeIndex>` or introduce a common path type before expanding path APIs. |
| Traversal           | Lazy repeatable `Walker`, multi-source, direction, radius, iterator-time snapshot | Lazy generators, primarily single-source, effective-edge-mode aware       | Effect already has the stronger general deterministic traversal abstraction.                                                                                       |
| Performance         | CSR fast path for immutable snapshots, map path for mutable graphs                | Cached CSR over indexed JSON                                              | New hot algorithms should reuse Effect's CSR infrastructure rather than public neighbor-array helpers.                                                             |

Sources: Effect models and storage (`Graph.ts:50-335`, `internal/graph.ts:9-27`), Effect CSR (`internal/graphCsr.ts:4-243`), Effect path result (`Graph.ts:4205-4236`), Stately models (`.repos/graph/src/types.ts:13-15`, `352-366`), and Stately algorithm conventions (`.repos/graph/docs/algorithms.md:1-7`, `173-178`).

### API rules for additions

- Keep weight/cost projection explicit. Effect edge data is generic; it should not adopt Stately's implicit `edge.weight ?? 1` convention.
- Use graph-kind constraints instead of runtime mixed-mode policies: MST, bridges, articulation points, biconnected components, k-cores, and bipartite matching naturally take `UndirectedGraph`; SCC, transitive reduction, dominators, and an initial max-flow API naturally take `DirectedGraph`.
- Return exact `NodeIndex` and `EdgeIndex` identities. For subset-producing algorithms, prefer index arrays or a graph reconstructed through `Snapshot` so the original indexes survive.
- Reuse `Walker` or another common repeatable `Iterable` abstraction for lazy multi-result algorithms. Do not copy Stately's `gen*` naming split.
- Require bounds only where they make a collector safe. All simple paths and all cycles are output-exponential; k-shortest paths are naturally bounded by `k`.
- Settle negative-cycle semantics before adding a shortest-path facade. `bellmanFord` currently returns `Option.none()` when a relevant negative cycle reaches the target, while `floydWarshall` throws `GraphError` for any negative cycle.

## Effect inventory

### Traversal and iteration

| API                                            | Purpose and notable semantics                                                                        | Stately relation                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `dfs`                                          | Lazy multi-source DFS preorder; outgoing, incoming, or direction-ignoring traversal; optional radius | Superset of `genDFS` and one-order `getPreorder`                                 |
| `bfs`                                          | Lazy multi-source BFS with the same direction/radius controls                                        | Superset of `genBFS`                                                             |
| `dfsPostOrder`                                 | Lazy postorder; bounded mode uses BFS membership before DFS ordering                                 | Equivalent to one-order `getPostorder`, with more controls                       |
| `topo`                                         | Lazy Kahn topological order for directed DAGs; can prioritize zero-in-degree initials                | Equivalent to `getTopologicalSort`, but throws instead of returning `null`       |
| `nodes`, direct graph iteration                | All nodes in insertion order                                                                         | Stately uses its `nodes` array directly                                          |
| `edges`                                        | All edges in insertion order, yielding copied edge values                                            | Stately uses its `edges` array directly                                          |
| `Walker.visit`, `indices`, `values`, `entries` | Lazy projection over any walker                                                                      | No common Stately wrapper; generators return graph objects/paths directly        |
| `externals`                                    | Lazy sources or sinks selected by absent incoming/outgoing adjacency                                 | Covers Stately `getSources` / `getSinks`, although the name is less discoverable |
| `neighbors`, `successors`, `predecessors`      | Unique adjacent node indexes                                                                         | Direct Stately query equivalents                                                 |

References: `Graph.ts:5579-5832`, `5871-6519`, `6521-6732`; Stately traversal reference `.repos/graph/docs/algorithms.md:9-17` and query summary `169-171`.

### Structural and path algorithms

| API                           | Purpose                                                                              | Stately relation                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `isAcyclic`                   | Cycle predicate for directed and undirected multigraphs                              | Existing equivalent                                                                                           |
| `isBipartite`                 | Two-colorability, currently typed only for undirected graphs                         | Existing but narrower; Stately ignores direction                                                              |
| `connectedComponents`         | Components of an undirected graph                                                    | Partial; Stately computes weak components for every graph mode                                                |
| `stronglyConnectedComponents` | Kosaraju SCCs for directed graphs                                                    | Existing equivalent                                                                                           |
| `dijkstra`                    | One non-negative weighted source-to-target shortest path                             | Covers Stately's default single shortest path, but not bidirectional search, source predicates, or tied paths |
| `astar`                       | One heuristic-guided non-negative shortest path                                      | Existing equivalent                                                                                           |
| `bellmanFord`                 | One shortest path with negative edges; no result if a relevant negative cycle exists | Existing equivalent to Stately's Bellman-Ford option                                                          |
| `floydWarshall`               | All-pairs distances and reconstructed paths, including negative edges                | Existing equivalent to one Stately all-pairs strategy                                                         |

References: `Graph.ts:3481-4199`, `4205-5577`; Stately connectivity and path reference `.repos/graph/docs/algorithms.md:18-53`.

### Set operations and structural transforms unique to Effect

| API                                                                                      | Purpose                                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `compose`                                                                                | Identity-based graph union where right-hand data wins         |
| `intersection`                                                                           | Shared nodes and edges by projected identity                  |
| `difference`                                                                             | Preserve left nodes and remove shared edge identities         |
| `symmetricDifference`                                                                    | Keep edge identities occurring in exactly one graph           |
| `complement`                                                                             | Add every absent non-loop adjacency over the current node set |
| `sum`                                                                                    | Disjoint union without identity merging                       |
| `neighborhood`                                                                           | Radius-bounded reached nodes plus their induced edges         |
| `reverse`                                                                                | Mutable in-place directed-edge reversal                       |
| `mapNodes`, `mapEdges`, `filterMapNodes`, `filterMapEdges`, `filterNodes`, `filterEdges` | Scoped-mutable payload and structural transformations         |

Stately has `getSubgraph`, `getLineGraph`, `getReversedGraph`, and a hierarchy-specific `getFlattenedGraph`, but no corresponding graph set-operation family. References: `Graph.ts:695-1417`, `1817-2172`; `.repos/graph/src/transforms.ts:7-359`.

## Comparative inventory and disposition

### Foundational traversal, ordering, and queries

| Stately APIs                                                                                                                          | What they are for                                                               | Effect status                                                    | Disposition                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `genBFS`, deprecated `bfs`                                                                                                            | Visit nodes by increasing unweighted hop distance                               | `bfs` is more configurable                                       | **Existing**                                                                              |
| `genDFS`, deprecated `dfs`                                                                                                            | Visit reachable nodes depth-first without recursion                             | `dfs` is more configurable                                       | **Existing**                                                                              |
| `getPreorder`                                                                                                                         | One deterministic DFS discovery order                                           | `dfs` is preorder                                                | **Existing**; do not add an alias                                                         |
| `getPostorder`                                                                                                                        | Descendants before ancestors                                                    | `dfsPostOrder`                                                   | **Existing**                                                                              |
| `genPreorders`, `getPreorders`, `genPostorders`, `getPostorders`                                                                      | Enumerate every DFS order permitted by neighbor choices                         | Missing                                                          | **Do not add**; exponential and rarely an application requirement                         |
| `getTopologicalSort`                                                                                                                  | Dependency order for a DAG                                                      | `topo`                                                           | **Existing**                                                                              |
| `getEdgesOf`, `getInEdges`, `getOutEdges`, `getEdgesBetween`                                                                          | Retrieve incident or endpoint-specific edges                                    | Only whole-graph `edges` and boolean `hasEdge`                   | **Add next**; foundational and preserves parallel-edge identity                           |
| `getDegree`, `getInDegree`, `getOutDegree`                                                                                            | Local connectivity/load and foundations for many analyses                       | Missing                                                          | **Add next**; common, cheap, and composable                                               |
| `getSources`, `getSinks`                                                                                                              | Find zero-in/zero-out boundary nodes                                            | `externals`                                                      | **Existing**; consider clearer aliases only for discoverability                           |
| `getRelativeDistanceMap`, `getRelativeDistance`                                                                                       | BFS hop distance from a compound parent's initial child, restricted to siblings | Effect has no built-in node hierarchy                            | **Do not port directly**; a generic unweighted distance map is independently worth adding |
| `getChildren`, `getParent`, `getAncestors`, `getDescendants`, `getRoots`, `getDepth`, `getSiblings`, `getLCA`, `isCompound`, `isLeaf` | Traverse Stately's explicit parent/initial-child hierarchy                      | Effect node payloads are opaque and have no structural hierarchy | **Do not add**; model hierarchy as edges or payload-specific helpers                      |

Stately references: `.repos/graph/docs/algorithms.md:9-17`, `169-171`; implementations in `.repos/graph/src/algorithms/traversal.ts:13-88`, `.repos/graph/src/algorithms/ordering.ts:5-160`, and `.repos/graph/src/queries.ts:304-359`, `712-857`.

### Connectivity, cycles, and DAG analysis

| Stately APIs                     | What they are for                                  | Effect status                                                           | Disposition                                                                                                 |
| -------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `hasPath`                        | Boolean reachability without constructing a path   | Only expressible by consuming `bfs`                                     | **Add next**; common and allows early exit internally                                                       |
| `isConnected`                    | Test for one weak component                        | Missing; derivable only for undirected input from `connectedComponents` | **Add next**, with documented weak semantics for directed graphs                                            |
| `isTree`                         | Connected, acyclic graph with `n - 1` edges        | Missing                                                                 | **Add next** for undirected graphs; decide separately whether directed arborescences need another predicate |
| `getConnectedComponents`         | Weakly connected partitions                        | Undirected-only `connectedComponents`                                   | **Add next** by widening or adding `weaklyConnectedComponents`                                              |
| `getStronglyConnectedComponents` | Mutual-reachability partitions                     | Directed `stronglyConnectedComponents`                                  | **Existing**                                                                                                |
| `isAcyclic`                      | Fast cycle predicate                               | `isAcyclic`                                                             | **Existing**                                                                                                |
| `genCycles`, `getCycles`         | Enumerate every simple cycle                       | Missing                                                                 | Add `findCycle` **next**; full lazy enumeration **later** because output is exponential                     |
| `getBridges`                     | Edges whose removal increases weak component count | Missing                                                                 | **Later / optional**; useful for resilience and network analysis                                            |
| `getArticulationPoints`          | Vertices whose removal disconnects the graph       | Missing                                                                 | **Later / optional**                                                                                        |
| `getBiconnectedComponents`       | Maximal regions robust to one vertex removal       | Missing                                                                 | **Later / optional**, implemented with the previous two as one coherent family                              |
| `getTransitiveReduction`         | Remove reachability-redundant DAG edges            | Missing                                                                 | **Add next**; common for dependency/build/workflow graphs                                                   |
| `getDominatorTree`               | Find nodes present on every root-to-node path      | Missing                                                                 | **Later / optional**; important for control-flow/workflow analysis but not general daily use                |

Stately references: `.repos/graph/docs/algorithms.md:18-39`; implementations in `.repos/graph/src/algorithms/traversal.ts:90-364`, `paths.ts:772-1017`, `connectivity.ts:1-215`, `reduction.ts`, and `dominators.ts`.

### Shortest, simple, and composed paths

| Stately APIs                                           | What they are for                                                                   | Effect status                  | Disposition                                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `getShortestPath`                                      | One weighted shortest path; bidirectional Dijkstra or Bellman-Ford                  | `dijkstra` and `bellmanFord`   | **Existing**, except Stately's selector and bidirectional optimizations               |
| `genShortestPaths`, `getShortestPaths`                 | All equal-cost shortest paths, optionally to every reachable node                   | Missing                        | **Add next** as a lazy API after edge-identifying path results exist                  |
| `getAStarPath`                                         | Heuristic point-to-point pathfinding                                                | `astar`                        | **Existing**                                                                          |
| `genAllPairsShortestPaths`, `getAllPairsShortestPaths` | All-pairs shortest paths using Dijkstra-per-source, Floyd-Warshall, or Bellman-Ford | `floydWarshall` only           | **Later**; add sparse-graph Dijkstra-per-source if real workloads outgrow O(n^3)      |
| `genSimplePaths`, `getSimplePaths`, `getSimplePath`    | Enumerate loopless paths, or stop after the first                                   | Missing                        | **Add next** only as lazy/bounded traversal; eager unrestricted enumeration is unsafe |
| `genShortestSimplePaths`, `getShortestSimplePaths`     | Yen's k shortest loopless alternatives                                              | Missing                        | **Later / optional**; valuable for routing alternatives after simple paths stabilize  |
| `getJoinedPath`, `joinPaths`                           | Concatenate compatible path values                                                  | No common public path value    | **Later**, as part of the shared path model rather than a standalone feature          |
| `getPathNodes`, `getPathEdges`, `getPathWeight`        | Project a path and sum its weight                                                   | Partly encoded in `PathResult` | **Later**, derived helpers once the path model is settled                             |
| `isValidPath`, `hasSubpath`, `getReducedPaths`         | Validate, compare, and remove redundant path values                                 | Missing                        | **Later / optional**; useful only after paths are first-class values                  |

Stately references: `.repos/graph/docs/algorithms.md:41-53`, `63-72`; path identity model `.repos/graph/src/types.ts:350-439`.

### Trails, spanning structures, flow, and matching

| Stately APIs                            | What they are for                                           | Effect status                 | Disposition                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `getEulerianPath`, `getEulerianCircuit` | Traverse every edge exactly once, open or closed            | Missing                       | **Later / optional**; canonical and linear-time, but less common than shortest paths/MST                       |
| `getMinimumSpanningTree`                | Minimum-weight connector or forest                          | Missing                       | **Add next** as `minimumSpanningForest` for undirected graphs                                                  |
| `getMaxFlow`, `getMinCut`               | Capacity routing and bottleneck partition between two nodes | Missing                       | **Later / optional**; common enough for an analysis layer, but requires careful parallel-edge result semantics |
| `isBipartite`                           | Test two-colorability                                       | Undirected-only `isBipartite` | **Existing**; widening to directed graphs by ignoring direction is optional                                    |
| `getMaximumBipartiteMatching`           | Maximum disjoint pair assignment                            | Missing                       | **Later / optional**; useful for scheduling/assignment and naturally follows bipartite partition output        |

Stately references: `.repos/graph/docs/algorithms.md:78-89`, `118-130`; implementations in `.repos/graph/src/algorithms/euler.ts`, `spanning-tree.ts`, `flow.ts`, and `bipartite.ts`.

### Centrality and link analysis

| Stately APIs                                                             | What they measure                                 | Effect status | Disposition                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| `getDegreeCentrality`, `getInDegreeCentrality`, `getOutDegreeCentrality` | Normalized local degree                           | Missing       | **Do not add separately**; add degree queries and let users normalize                 |
| `getClosenessCentrality`                                                 | How near a node is to reachable nodes             | Missing       | **Later / optional analytics**                                                        |
| `getBetweennessCentrality`                                               | How often a node lies on shortest paths           | Missing       | **Later / optional analytics**; among the most useful advanced measures               |
| `getPageRank`                                                            | Stationary importance under damped link-following | Missing       | **Later / optional analytics**; widely recognized, but needs convergence options      |
| `getHITS`                                                                | Hub and authority scores                          | Missing       | **Later / optional analytics**                                                        |
| `getEigenvectorCentrality`                                               | Importance inherited from important in-neighbors  | Missing       | **Later / optional analytics**; non-convergence is part of the API                    |
| `getKatzCentrality`                                                      | Attenuated walk-count centrality                  | Missing       | **Later / optional analytics**; parameter validity and convergence are easy to misuse |

These functions are coherent as a separate analysis family. Adding one or two to the core would leave inconsistent weighting, normalization, convergence, and cancellation conventions. Stately reference: `.repos/graph/docs/algorithms.md:91-103`; implementation `.repos/graph/src/algorithms/centrality.ts:99-548`.

### Communities and cores

| Stately APIs                                               | What they are for                          | Effect status | Disposition                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------- |
| `getCoreNumbers`, `getKCore`                               | Dense-subgraph peeling and membership      | Missing       | **Later / optional analytics**; exact, linear, and a reasonable first analytics family         |
| `getLouvainCommunities`                                    | Fast modularity-based clustering           | Missing       | **Later / optional analytics**                                                                 |
| `getLabelPropagationCommunities`                           | Iterative label-based clustering           | Missing       | **Later / optional analytics**; seeded/random tie behavior needs an explicit randomness policy |
| `genGirvanNewmanCommunities`, `getGirvanNewmanCommunities` | Hierarchical splitting by edge betweenness | Missing       | **Later / optional analytics**; expensive but laziness is valuable                             |
| `getGreedyModularityCommunities`                           | Agglomerative modularity clustering        | Missing       | **Do not add initially**; Stately itself characterizes it as small-graph/very expensive        |
| `getModularity`                                            | Score a proposed community partition       | Missing       | **Later / optional analytics**, alongside community algorithms                                 |

Stately reference: `.repos/graph/docs/algorithms.md:105-116`, `132-137`; implementations `.repos/graph/src/algorithms/community.ts`, `louvain.ts`, and `cores.ts`.

### Structural and combinatorial analysis

| Stately APIs                          | What they are for                                                      | Effect status | Disposition                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `isIsomorphic`                        | Structural equality up to node renaming, optionally matching payloads  | Missing       | **Later / optional**; exact matching is exponential in the worst case                       |
| `getGraphColoring`, `isValidColoring` | Assign/check adjacent-node colors                                      | Missing       | **Later / optional**; distinguish heuristic coloring from minimum coloring in naming/docs   |
| `isPlanar`                            | Test whether the underlying simple graph has a crossing-free embedding | Missing       | **Later / optional**; useful for layout/graph theory, uncommon in general application logic |
| `getTSPTour`                          | Approximate low-cost tour visiting all nodes                           | Missing       | **Do not add to core** without an explicit approximation framework and guarantees           |
| `getSteinerTree`                      | Approximate low-cost connector for selected terminals                  | Missing       | **Do not add to core** for the same reason                                                  |

Stately references: `.repos/graph/docs/algorithms.md:139-145`; implementations `.repos/graph/src/algorithms/isomorphism.ts`, `coloring.ts`, `planarity.ts`, `tsp.ts`, and `steiner.ts`.

### Random and predefined walks

| Stately APIs                                                          | What they are for                                          | Effect status | Disposition                                                               |
| --------------------------------------------------------------------- | ---------------------------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| `genRandomWalk`                                                       | Uniform random outgoing/traversable edge per step          | Missing       | **Later / separate MBT module** with explicit RNG or Effect `Random`      |
| `genWeightedRandomWalk`                                               | Random edge proportional to weight                         | Missing       | **Later / separate MBT module**                                           |
| `genQuickRandomWalk`                                                  | Prefer unseen edges and BFS-hop to the nearest unseen edge | Missing       | **Do not add to core**; this is coverage-oriented model-based testing     |
| `genPredefinedWalk`                                                   | Replay and validate an edge sequence                       | Missing       | **Later** as path validation/replay if an edge-aware path model is added  |
| `genWalkSteps`, `genWalkUntilNode`, `genWalkUntilEdge`                | Generic generator stop conditions                          | Missing       | **Do not add**; ordinary iterable/stream combinators should express these |
| `genWalkUntilNodeCoverage`, `genWalkUntilEdgeCoverage`, `getCoverage` | Stop/measure model exploration coverage                    | Missing       | **Do not add to core**; testing-specific                                  |

The deprecated `takeSteps`, `takeUntilNode`, `takeUntilEdge`, `takeUntilNodeCoverage`, and `takeUntilEdgeCoverage` aliases are not separate capabilities. Stately references: `.repos/graph/docs/algorithms.md:147-159`; implementation `.repos/graph/src/walks.ts:71-461`.

### Path-set coverage

| Stately APIs                 | What they are for                                            | Effect status | Disposition            |
| ---------------------------- | ------------------------------------------------------------ | ------------- | ---------------------- |
| `getCoverageTargets`         | Derive node, edge, edge-pair, or maximal-simple-path targets | Missing       | **Do not add to core** |
| `getPathCoverage`            | Measure path-set coverage of targets                         | Missing       | **Do not add to core** |
| `getCoveragePreservingPaths` | Greedy/exact reduction preserving observed coverage          | Missing       | **Do not add to core** |
| `getEdgeCoveragePaths`       | Heuristic shortest-access plan covering reachable edges      | Missing       | **Do not add to core** |

These are internally graph-generic but product-wise form a model-based-testing toolkit. They should live with test planning if Effect develops such a facility. Stately reference: `.repos/graph/docs/algorithms.md:55-76`; implementations `.repos/graph/src/path-utils.ts` and `.repos/graph/src/coverage.ts`.

### Graph construction and transforms

| Stately APIs                | What they are for                                                          | Effect status                                                            | Disposition                                                                                  |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `createCompleteGraph`       | Construct `K_n`                                                            | Missing; easy with `undirected`                                          | **Do not add to core**; test/benchmark helper                                                |
| `createGridGraph`           | Construct a rectangular lattice                                            | Missing                                                                  | **Do not add to core**; test/benchmark helper                                                |
| `createRandomGraph`         | Erdos-Renyi random graph                                                   | Missing                                                                  | **Do not add to core**; test/benchmark helper and randomness concern                         |
| `createWattsStrogatzGraph`  | Seeded small-world graph                                                   | Missing                                                                  | **Do not add to core**; network-science/test helper                                          |
| `createBarabasiAlbertGraph` | Seeded preferential-attachment graph                                       | Missing                                                                  | **Do not add to core**; network-science/test helper                                          |
| `createGraphFromTransition` | BFS-unfold a state transition function into a finite directed graph        | Missing                                                                  | **Later / separate MBT module**; exploration rather than an algorithm over an existing graph |
| `getSubgraph`               | Induced graph over an explicit node set                                    | Only radius-derived `neighborhood`; mutable `filterNodes` can emulate it | **Add next** as `inducedSubgraph`                                                            |
| `getLineGraph`              | Turn original edges into nodes and connect consecutively traversable edges | Missing                                                                  | **Later / optional**; mathematically standard but niche                                      |
| `getReversedGraph`          | Return a copy with edge directions reversed                                | Mutable `reverse` plus `mutate`                                          | **Existing by composition**; no extra API needed                                             |
| `getFlattenedGraph`         | Flatten Stately's parent/initial-node hierarchy                            | Not applicable to Effect's flat model                                    | **Do not add**                                                                               |

Stately references: `.repos/graph/src/generators.ts:17-296`, `.repos/graph/src/graph.ts:239-334`, `.repos/graph/src/transforms.ts:7-359`.

## Proposed implementation sequence

### Phase 1: complete the basic graph core

- Add incident-edge and degree queries, a generic unweighted distance map, `hasPath`, `isConnected`, directed weak components, and `isTree`.
- Add `inducedSubgraph`.
- Add a cycle-witness query rather than immediately enumerating every cycle.
- Define whether all result-producing transforms preserve original indexes. Prefer preserving indexes through `Snapshot` when the result is structurally a subset of one graph.

### Phase 2: establish paths as a reusable public model

- Add exact traversed edge indexes to shortest-path results, compatibly if possible.
- Reuse the model for lazy all-tied shortest paths and lazy simple paths.
- Put output bounds on convenience collectors; do not make unrestricted exponential eager APIs the default.
- Consider an edge-aware traversal/walk primitive only after the path representation is stable.

### Phase 3: add the common weighted/structural algorithms

- Add `minimumSpanningForest` and `transitiveReduction`.
- Then evaluate bridges/articulation/biconnected components and Eulerian trails as cohesive families.
- Add sparse all-pairs shortest paths only from benchmark evidence; `floydWarshall` already covers dense and negative-edge cases.

### Phase 4: decide whether analytics belongs in `Graph`

- If yes, start with k-cores and one coherent centrality set, with common weighting, normalization, convergence, and cancellation options.
- Keep community detection, flow, matching, planarity, and isomorphism grouped as optional analysis capabilities rather than expanding the basic module opportunistically.

## Bottom line

Effect already matches Stately on the essential traversal modes, DAG ordering, cycle predicate, component analysis, and principal shortest-path algorithms. Its largest practical gaps are not PageRank or community detection; they are the small foundational queries (`degree`, reachability, connectivity), weak components for directed graphs, an edge-identifying reusable path model, minimum spanning forests, explicit induced subgraphs, and transitive reduction.

Those additions would make `Graph` feel complete for dependency graphs, workflows, routing, and general application graph problems without inheriting Stately's much broader analytics and model-based-testing scope.
