# Example Suggestions: `effect/Graph`

- **Package:** `effect`
- **Source:** `packages/effect/src/Graph.ts`
- **Uncovered API records:** 41
- **Priorities:** 0 required, 2 recommended, 37 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind                    | Priority        |
| ----------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/Graph.GraphError`                 |  434 | `root-declaration`      | **recommended** |
| `effect/Graph.isGraph`                    |  471 | `root-declaration`      | **recommended** |
| `effect/Graph.sum`                        | 1410 | `root-declaration`      | **optional**    |
| `effect/Graph.successors`                 | 2715 | `root-declaration`      | **optional**    |
| `effect/Graph.predecessors`               | 2751 | `root-declaration`      | **optional**    |
| `effect/Graph.NodeIndex`                  |   50 | `root-declaration`      | **optional**    |
| `effect/Graph.EdgeIndex`                  |   73 | `root-declaration`      | **optional**    |
| `effect/Graph.Edge`                       |   90 | `root-declaration`      | **optional**    |
| `effect/Graph.Kind`                       |  110 | `root-declaration`      | **optional**    |
| `effect/Graph.Proto`                      |  124 | `root-declaration`      | **optional**    |
| `effect/Graph.Graph (type) (type)`        |  143 | `root-declaration`      | **optional**    |
| `effect/Graph.Graph (type) (type)`        |  154 | `namespace`             | **optional**    |
| `effect/Graph.MutableGraph (type) (type)` |  183 | `root-declaration`      | **optional**    |
| `effect/Graph.MutableGraph (type) (type)` |  197 | `namespace`             | **optional**    |
| `effect/Graph.DirectedGraph`              |  261 | `root-declaration`      | **optional**    |
| `effect/Graph.UndirectedGraph`            |  282 | `root-declaration`      | **optional**    |
| `effect/Graph.MutableDirectedGraph`       |  299 | `root-declaration`      | **optional**    |
| `effect/Graph.MutableUndirectedGraph`     |  316 | `root-declaration`      | **optional**    |
| `effect/Graph.IdentityOptions`            |  781 | `root-declaration`      | **optional**    |
| `effect/Graph.NeighborhoodConfig`         | 1316 | `root-declaration`      | **optional**    |
| `effect/Graph.GraphVizOptions.nodeLabel`  | 2870 | `member`                | **optional**    |
| `effect/Graph.GraphVizOptions.edgeLabel`  | 2876 | `member`                | **optional**    |
| `effect/Graph.GraphVizOptions.graphName`  | 2882 | `member`                | **optional**    |
| `effect/Graph.MermaidOptions.nodeLabel`   | 3132 | `member`                | **optional**    |
| `effect/Graph.MermaidOptions.edgeLabel`   | 3138 | `member`                | **optional**    |
| `effect/Graph.MermaidOptions.diagramType` | 3145 | `member`                | **optional**    |
| `effect/Graph.MermaidOptions.direction`   | 3151 | `member`                | **optional**    |
| `effect/Graph.MermaidOptions.nodeShape`   | 3157 | `member`                | **optional**    |
| `effect/Graph.Direction`                  | 3434 | `root-declaration`      | **optional**    |
| `effect/Graph.PathResult`                 | 3991 | `root-declaration`      | **optional**    |
| `effect/Graph.DijkstraConfig`             | 4070 | `root-declaration`      | **optional**    |
| `effect/Graph.AllPairsResult`             | 4263 | `root-declaration`      | **optional**    |
| `effect/Graph.AstarConfig`                | 4456 | `root-declaration`      | **optional**    |
| `effect/Graph.BellmanFordConfig`          | 4685 | `root-declaration`      | **optional**    |
| `effect/Graph.NodeWalker`                 | 4989 | `root-declaration`      | **optional**    |
| `effect/Graph.EdgeWalker`                 | 5008 | `root-declaration`      | **optional**    |
| `effect/Graph.SearchConfig`               | 5107 | `root-declaration`      | **optional**    |
| `effect/Graph.TopoConfig`                 | 5362 | `root-declaration`      | **optional**    |
| `effect/Graph.ExternalsConfig`            | 5751 | `root-declaration`      | **optional**    |
| `effect/Graph.Graph.Variance`             |  161 | `namespace-declaration` | **discouraged** |
| `effect/Graph.MutableGraph.Variance`      |  204 | `namespace-declaration` | **discouraged** |

## Recommended

### `effect/Graph.GraphError`

- **Source:** `packages/effect/src/Graph.ts:434`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error thrown by graph operations when the requested graph structure is invalid, such as referencing a missing node or using unsupported edge weights.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Graph } from "effect"` and use `Graph.GraphError`.
- **Suggested snippet:** Create or capture `Graph.GraphError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Graph.isGraph`

- **Source:** `packages/effect/src/Graph.ts:471`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if a value has the graph runtime type identifier, narrowing it to an immutable or mutable graph.
- **Signature hint:** `declare function isGraph<N = unknown, E = unknown, T extends Kind = Kind, U = never>(u: U | Graph<N, E, T> | MutableGraph<N, E, T>): u is Graph<N, E, T> | MutableGraph<N, E, T>`
- **Import guidance:** Start from `import { Graph } from "effect"` and use `Graph.isGraph`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Graph.isGraph` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Graph.sum`

- **Source:** `packages/effect/src/Graph.ts:1410`
- **Kind / category:** `root-declaration` / `set operations`
- **Priority:** **optional**
- **Current description:** Returns the disjoint union of two graphs.
- **Signature hint:** `declare function sum<N, E, T extends Kind>(that: Graph<N, E, T>): (self: Graph<N, E, NoInfer<T>>) => Graph<N, E, T> declare function sum<N, E, T extends Kind>(self: Graph<N, E, T>, that: Graph<N, E, NoInfer<T>>): Graph<N, E, T>`
- **Import guidance:** Start from `import { Graph } from "effect"` and use `Graph.sum`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the disjoint union of two graphs. Call `Graph.sum` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.successors`

- **Source:** `packages/effect/src/Graph.ts:2715`
- **Kind / category:** `root-declaration` / `queries`
- **Priority:** **optional**
- **Current description:** Returns the outgoing neighbor node indices for a node in a directed graph.
- **Signature hint:** `declare function successors(nodeIndex: NodeIndex): <N, E>(graph: Graph<N, E, 'directed'> | MutableGraph<N, E, 'directed'>) => Array<NodeIndex> declare function successors<N, E>(graph: Graph<N, E, 'directed'> | MutableGraph<N, E, 'directed'>, nodeIndex: NodeIndex): Array<NodeIndex>`
- **Import guidance:** Start from `import { Graph } from "effect"` and use `Graph.successors`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the outgoing neighbor node indices for a node in a directed graph. Call `Graph.successors` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.predecessors`

- **Source:** `packages/effect/src/Graph.ts:2751`
- **Kind / category:** `root-declaration` / `queries`
- **Priority:** **optional**
- **Current description:** Returns the incoming neighbor node indices for a node in a directed graph.
- **Signature hint:** `declare function predecessors(nodeIndex: NodeIndex): <N, E>(graph: Graph<N, E, 'directed'> | MutableGraph<N, E, 'directed'>) => Array<NodeIndex> declare function predecessors<N, E>(graph: Graph<N, E, 'directed'> | MutableGraph<N, E, 'directed'>, nodeIndex: NodeIndex): Array<NodeIndex>`
- **Import guidance:** Start from `import { Graph } from "effect"` and use `Graph.predecessors`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the incoming neighbor node indices for a node in a directed graph. Call `Graph.predecessors` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.NodeIndex`

- **Source:** `packages/effect/src/Graph.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Node index for node identification using plain numbers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.NodeIndex`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.EdgeIndex`

- **Source:** `packages/effect/src/Graph.ts:73`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Edge index for edge identification using plain numbers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.EdgeIndex`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.Edge`

- **Source:** `packages/effect/src/Graph.ts:90`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents edge data containing source, target, and user data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Graph } from "effect"` and use `Graph.Edge`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Graph.Edge`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.Kind`

- **Source:** `packages/effect/src/Graph.ts:110`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Graph type for distinguishing directed and undirected graphs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.Kind`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.Proto`

- **Source:** `packages/effect/src/Graph.ts:124`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Common public protocol for graph values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.Proto`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.Graph (type) (type)`

- **Source:** `packages/effect/src/Graph.ts:143`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Immutable graph interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.Graph (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.Graph (type) (type)`

- **Source:** `packages/effect/src/Graph.ts:154`
- **Kind / category:** `namespace` / `models`
- **Priority:** **optional**
- **Current description:** Companion namespace containing type-level metadata for immutable graphs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.Graph (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.MutableGraph (type) (type)`

- **Source:** `packages/effect/src/Graph.ts:183`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Mutable graph interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.MutableGraph (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.MutableGraph (type) (type)`

- **Source:** `packages/effect/src/Graph.ts:197`
- **Kind / category:** `namespace` / `models`
- **Priority:** **optional**
- **Current description:** Companion namespace containing type-level metadata for scoped mutable graphs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.MutableGraph (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.DirectedGraph`

- **Source:** `packages/effect/src/Graph.ts:261`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Immutable graph type for source-to-target relationships.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.DirectedGraph`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.UndirectedGraph`

- **Source:** `packages/effect/src/Graph.ts:282`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Immutable graph type for relationships without source-to-target direction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.UndirectedGraph`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.MutableDirectedGraph`

- **Source:** `packages/effect/src/Graph.ts:299`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Mutable directed graph type alias.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.MutableDirectedGraph`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.MutableUndirectedGraph`

- **Source:** `packages/effect/src/Graph.ts:316`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Mutable undirected graph type alias.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.MutableUndirectedGraph`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.IdentityOptions`

- **Source:** `packages/effect/src/Graph.ts:781`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configures node and edge identity for graph set operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.IdentityOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.NeighborhoodConfig`

- **Source:** `packages/effect/src/Graph.ts:1316`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for selecting a graph neighborhood.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.NeighborhoodConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.GraphVizOptions.nodeLabel`

- **Source:** `packages/effect/src/Graph.ts:2870`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Function to generate custom labels for nodes. Defaults to String(data) if not provided.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Graph.GraphVizOptions.nodeLabel` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.GraphVizOptions.edgeLabel`

- **Source:** `packages/effect/src/Graph.ts:2876`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Function to generate custom labels for edges. Defaults to String(data) if not provided.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Graph.GraphVizOptions.edgeLabel` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.GraphVizOptions.graphName`

- **Source:** `packages/effect/src/Graph.ts:2882`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name for the DOT graph. Defaults to "G" if not provided.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Graph.GraphVizOptions.graphName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.MermaidOptions.nodeLabel`

- **Source:** `packages/effect/src/Graph.ts:3132`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Function to generate custom labels for nodes. Defaults to String(data) if not provided.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Graph.MermaidOptions.nodeLabel` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.MermaidOptions.edgeLabel`

- **Source:** `packages/effect/src/Graph.ts:3138`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Function to generate custom labels for edges. Defaults to String(data) if not provided.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Graph.MermaidOptions.edgeLabel` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.MermaidOptions.diagramType`

- **Source:** `packages/effect/src/Graph.ts:3145`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Diagram type override. If not specified, automatically detects: - "flowchart" for directed graphs - "graph" for undirected graphs
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Graph.MermaidOptions.diagramType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.MermaidOptions.direction`

- **Source:** `packages/effect/src/Graph.ts:3151`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Direction for diagram layout. Defaults to "TD" (Top Down) if not provided.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Graph.MermaidOptions.direction` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.MermaidOptions.nodeShape`

- **Source:** `packages/effect/src/Graph.ts:3157`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Function to determine node shape for each node. Defaults to "rectangle" for all nodes if not provided.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Graph.MermaidOptions.nodeShape` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.Direction`

- **Source:** `packages/effect/src/Graph.ts:3434`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Direction of directed edges relative to a node.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.Direction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.PathResult`

- **Source:** `packages/effect/src/Graph.ts:3991`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Result of a shortest path computation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.PathResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.DijkstraConfig`

- **Source:** `packages/effect/src/Graph.ts:4070`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for finding a shortest path with Dijkstra's algorithm.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.DijkstraConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.AllPairsResult`

- **Source:** `packages/effect/src/Graph.ts:4263`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Result of an all-pairs shortest path computation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.AllPairsResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.AstarConfig`

- **Source:** `packages/effect/src/Graph.ts:4456`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for finding a shortest path with the A* algorithm.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.AstarConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.BellmanFordConfig`

- **Source:** `packages/effect/src/Graph.ts:4685`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for finding a shortest path with the Bellman-Ford algorithm.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.BellmanFordConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.NodeWalker`

- **Source:** `packages/effect/src/Graph.ts:4989`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type alias for node iteration using Walker. NodeWalker is represented as Walker<NodeIndex, N>.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.NodeWalker`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.EdgeWalker`

- **Source:** `packages/effect/src/Graph.ts:5008`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type alias for edge iteration using Walker. EdgeWalker is represented as Walker<EdgeIndex, Edge<E>>.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.EdgeWalker`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.SearchConfig`

- **Source:** `packages/effect/src/Graph.ts:5107`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for DFS, BFS, and postorder graph traversals.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.SearchConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.TopoConfig`

- **Source:** `packages/effect/src/Graph.ts:5362`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for the topological sort iterator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.TopoConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Graph.ExternalsConfig`

- **Source:** `packages/effect/src/Graph.ts:5751`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for selecting external nodes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Graph.ExternalsConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Graph.Graph.Variance`

- **Source:** `packages/effect/src/Graph.ts:161`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for immutable graphs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Graph.Graph.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Graph.MutableGraph.Variance`

- **Source:** `packages/effect/src/Graph.ts:204`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for scoped mutable graphs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Graph.MutableGraph.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
