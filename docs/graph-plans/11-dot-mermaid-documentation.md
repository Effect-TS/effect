# DOT, Mermaid, and Graph Documentation Plan

## Objective

Harden the existing `Graph.toGraphViz` and `Graph.toMermaid` emitters without changing their default graph semantics,
then add only the small amount of output control that the `Graph` model can represent faithfully. Consolidate the
module's user documentation after the shared graph semantics and algorithm surface have stabilized.

Success means:

- existing calls and data-first/data-last signatures continue to work;
- default output remains byte-for-byte stable except where a regression test proves that the current text is invalid,
  ambiguous, or permits statement injection;
- nodes and edges are emitted in stable public index/insertion order, including sparse indexes after deletion;
- labels and optional identifiers cannot escape their DOT or Mermaid syntactic context;
- self-loops and every parallel edge remain separate statements;
- both emitters remain synchronous, dependency-free at runtime, and `O(V + E + output size)` apart from user callbacks;
- the Graph guide states semantics, lifecycle, complexity, and algorithm-selection guidance in one maintained place.

## Current Baseline

`packages/effect/src/Graph.ts` currently provides:

- `GraphVizOptions<N, E>` with `nodeLabel`, `edgeLabel`, and `graphName`;
- `toGraphViz`, which always quotes numeric node indexes and the graph name, escapes backslashes, quotes, and line
  breaks, and emits nodes followed by edges in `Map` iteration order;
- `MermaidOptions<N, E>` with `nodeLabel`, `edgeLabel`, `diagramType`, `direction`, and `nodeShape`;
- `toMermaid`, which uses numeric node indexes, supports eight legacy flowchart shapes, and entity-escapes a selected
  set of label characters;
- tests for empty, directed, undirected, custom-label, shape, direction, self-loop, parallel-edge, and basic escaping
  cases.

The baseline has useful properties that must not be lost: automatic numeric indexes are deterministic, the emitters
do not inspect user data beyond calling configured functions, and parallel edges are not deduplicated. The tests rely
too heavily on `toContain`, however, and do not establish complete ordering or injection safety. Mermaid escaping also
needs an explicit conservative syntax contract rather than an expanding list of characters inferred from examples.

Lessons to adopt from `.repos/graph` are limited to canonical ordering, DOT reserved-word and newline handling,
Mermaid exact syntax fixtures, mutation-stable edge ordering, and explicit support limitations. Its parsers, format
preservation bags, hierarchy, ports, layout adapters, visual fields, click handlers, directives, and non-flowchart
Mermaid dialects do not fit Effect's graph model or this plan.

## Compatibility Contracts

### Ordering and snapshots

- Emit the header first, nodes in ascending stable insertion/index order, then edges in ascending stable
  insertion/index order, followed by the closing DOT brace. This is the current `Map` order and is intentionally not a
  semantic sort by label, endpoint, or user-provided identifier.
- Deletion leaves sparse indexes and does not renumber output. Adding after deletion uses the next monotonic index.
- A mutable graph is observed synchronously at the instant `toGraphViz` or `toMermaid` is called. Callbacks must not
  mutate it; document that such re-entrant mutation has unspecified results rather than copying the full graph.
- Replace partial output assertions with exact multiline assertions or focused inline snapshots. Avoid external
  snapshot files for these small strings so format changes are visible in review.
- Attribute maps, when enabled, use a documented canonical key order independent of JavaScript object insertion order.

### Labels and identifiers

- Keep `nodeLabel` and `edgeLabel` as literal-text callbacks. They never opt into DOT HTML labels, Mermaid markdown
  strings, directives, styles, links, or raw syntax.
- Keep automatic node identifiers based on `NodeIndex`; labels never become identifiers. Edge statements continue to
  reference the emitted identifier map, not labels.
- Custom node identifiers are additive and must be unique. DOT can quote any supported identifier text. Mermaid custom
  identifiers must either be encoded into a documented safe identifier or rejected; never interpolate an unchecked
  identifier. Prefer deterministic encoding plus collision detection so arbitrary application IDs remain usable.
- Empty labels retain current behavior: DOT emits `label=""`; Mermaid emits an unlabeled edge and an explicitly empty
  quoted node label. Any change to this distinction requires a regression test because Mermaid currently uses label
  emptiness to select edge syntax.

### Parallel edges, self-loops, and strict DOT

- Emit one edge statement per `EdgeIndex`, including identical endpoint/label pairs and self-loops.
- Do not add a `strict` DOT option. `strict graph` and `strict digraph` collapse multiedges in Graphviz and therefore
  contradict Effect Graph's first-class parallel-edge semantics.
- Mermaid may visually overlap parallel edges, but the source must retain every statement in edge-index order. The
  guide must distinguish source fidelity from renderer geometry.
- Do not coalesce, reverse, canonicalize endpoints, or otherwise rewrite undirected parallel edges.

### Subgraphs

Effect Graph has no compound-node or parent relation. Consequently, this plan does not infer subgraphs from node data
or topology and does not add nested subgraphs, subgraph endpoints, cluster edges, or hierarchy APIs.

Even a one-level output group introduces hierarchy-like grouping semantics that are outside this initiative's
no-hierarchy scope and differ across DOT and Mermaid. `GraphOutputGroup` and `nodeGroup` are deferred by default and are
not part of any implementation phase. Reconsider them only in a separate proposal with a concrete use case and
cross-format contract; emitter hardening and documentation must not reserve these names.

## Additive API Shape

Preserve both existing overloads of `toGraphViz` and `toMermaid`. Extend the option interfaces rather than adding new
top-level emitters or a generic format abstraction.

```ts
export type GraphVizAttributeValue = string | number | boolean

export type GraphVizAttributes = Readonly<Record<string, GraphVizAttributeValue>>

export interface GraphVizOptions<N, E> {
  readonly nodeLabel?: (data: N) => string
  readonly edgeLabel?: (data: E) => string
  readonly graphName?: string
  readonly nodeId?: (data: N, index: NodeIndex) => string
  readonly graphAttributes?: GraphVizAttributes
  readonly nodeAttributes?: (data: N, index: NodeIndex) => GraphVizAttributes
  readonly edgeAttributes?: (data: E, index: EdgeIndex, edge: Edge<E>) => GraphVizAttributes
  readonly indent?: string
  readonly lineSeparator?: "\n" | "\r\n"
}

export interface MermaidOptions<N, E> {
  readonly nodeLabel?: (data: N) => string
  readonly edgeLabel?: (data: E) => string
  readonly diagramType?: MermaidDiagramType
  readonly direction?: MermaidDirection
  readonly nodeShape?: (data: N) => MermaidNodeShape
  readonly nodeId?: (data: N, index: NodeIndex) => string
  readonly indent?: string
  readonly lineSeparator?: "\n" | "\r\n"
}
```

Signature decisions:

- Retain the existing one-argument label and shape callbacks to avoid subtly changing their public contract. New
  callbacks receive indexes explicitly.
- Default `indent` remains two spaces and default `lineSeparator` remains `"\n"`, preserving current output.
- Attribute values are always emitted as escaped quoted DOT strings. Numbers and booleans are converted to their
  canonical string forms; no raw/HTML value escape hatch is provided.
- Quote/escape DOT attribute keys as DOT identifiers, sort them lexically, and reserve `label`. The generated label
  wins over a conflicting callback attribute, with the conflict documented and preferably rejected for new options.
- `graphAttributes` emits graph attributes only. Do not add node/edge default bags because defaults introduce ordering
  and override semantics not represented by Effect Graph.
- Mermaid does not receive arbitrary attributes. Its style, class, click, directive, and initialization syntaxes have
  renderer and security semantics beyond literal graph emission.
- Treat `diagramType` as an existing syntax override, not as a conversion of graph kind. Preserve it for compatibility
  while documenting that overriding it can intentionally render a directed graph with line syntax or an undirected
  graph with arrows.

Mermaid v11 edge IDs are a conditional follow-up, not part of the initial signature. Add an `edgeId` callback and an
explicit syntax-version option only if exact deterministic fixtures establish one stable syntax that preserves parallel
edges. Do not expose a guessed version union or emit v11-only syntax under existing defaults.

## Escaping and Security

### DOT

Create context-specific internal formatters rather than one general replacement function:

- quoted identifier: graph names, custom node IDs, and attribute keys when not safely bare;
- quoted literal string: labels and every attribute value;
- statement assembly: fixed keywords, operators, delimiters, indentation, and line separators only.

Escape backslash before quote, normalize CRLF/CR/LF to DOT `\n`, and cover other control characters according to the
Graphviz DOT quoted-string grammar. Never accept HTML-like labels or raw attribute fragments. Validate custom-ID
uniqueness before emitting edges. Regression fixtures must include DOT keywords, quotes, backslashes, all newline
forms, NUL/C0 controls where Graphviz has defined behavior, Unicode, very long labels, and payloads containing `];`,
`}`, `->`, `--`, comments, and new graph statements.

### Mermaid

Choose a documented conservative flowchart baseline from the syntax contract represented by exact fixtures. Centralize
escaping for quoted node labels and pipe-delimited edge labels, accounting for replacement order so
newly generated entities are not escaped again. Cover quotes, hashes, ampersands, semicolons, pipes, brackets, braces,
parentheses, backslashes, CR/LF variants, Unicode, Mermaid comments (`%%`), directives (`%%{...}%%`), `end`, shape
delimiters, arrows, and HTML-like text.

The output is safe diagram source, not sanitized HTML. Document that consumers remain responsible for configuring
their Mermaid renderer's security level and sanitizing the renderer's generated HTML/SVG. The emitter must not create
click handlers, links, raw HTML, initialization directives, style directives, or JavaScript URLs.

For both formats, test malicious strings in graph names, node labels, edge labels, IDs, and DOT attribute keys/values.
Assertions must prove that payload text remains inside one syntactic value and cannot add a
node, edge, attribute statement, directive, subgraph, or closing delimiter.

## Mermaid Syntax Policy

- Do not claim parser-version conformance because parser dependencies and parser-backed tests are out of scope.
- Keep default output in the conservative flowchart subset represented by exact fixtures: `graph`/`flowchart` headers, the five
  directions already exposed, current legacy node-shape delimiters, and `-->`/`---` edges with quoted labels.
- Use exact deterministic strings and syntactic containment assertions for escaping and injection cases. Do not add DOT,
  Graphviz, or Mermaid parser dependencies to tests or production.
- Put newer syntax behind an explicit additive option only when it provides a concrete capability and has separately
  reviewed fixtures.

## Performance Plan

- Keep a single pass to collect/validate optional custom node IDs, one pass over nodes, and one pass over edges.
- Use an array of complete lines and one final `join`; do not repeatedly concatenate the complete output.
- Do not build a dense graph snapshot, adjacency traversal, or semantic sort for emission.
- Call each configured node callback once per node and each edge callback once per edge. Cache callback results needed
  for both declarations and endpoints.
- Bound additional memory to `O(V + output size)` when custom IDs are used and `O(output size)` otherwise.
- Add focused emitter benchmarks for empty, sparse-index, long-label, and large sparse/dense graphs. Measure default
  and fully configured output separately. The benchmark gate should catch superlinear growth but should not publish
  machine-specific timing promises in JSDoc.

## Consolidated Graph User Documentation

Add a maintained Graph guide in the package documentation location selected by the documentation maintainers, with
`packages/effect/GRAPH.md` as the preferred analogue to `SCHEMA.md`. Link it from the package's documentation index and
keep API JSDoc focused on individual functions rather than duplicating the guide.

The guide must include:

- the directed/undirected model, opaque stable `NodeIndex`/`EdgeIndex` identifiers, insertion ordering, sparse indexes,
  and lookup/error conventions;
- unique-neighbor versus incident-edge semantics, directed and undirected degree rules, self-loops, and parallel-edge
  behavior;
- construction and the scoped mutation lifecycle: `directed`/`undirected`, `mutate`, manual
  `beginMutation`/`endMutation`, structural copying, invalid finalized handles, and why callbacks are synchronous;
- iteration, queries, transforms, and the distinction between node walkers and edge-preserving APIs;
- an audited complexity table for construction, mutation, lookup, traversal, connectivity, path, optimization,
  analytics, and DOT/Mermaid emission. State assumptions and use `V`, `E`, and result-size terms; do not infer
  complexity from function names;
- an algorithm-choice guide covering BFS versus DFS, Dijkstra versus Bellman-Ford versus Floyd-Warshall versus A*,
  directed versus undirected connectivity, DAG/topological operations, and when parallel edges or negative weights
  affect the choice;
- DOT and Mermaid examples, option behavior, deterministic ordering, escaping/security boundaries, renderer-version
  policy, and the fact that emission does not perform layout;
- a persistence section that links to the separate Graph Schema/persistence plan rather than defining an ad hoc JSON
  representation here;
- a benchmark section that links to reproducible benchmark source and checked-in/public CI results. Publish fixture
  sizes, graph density, runtime, hardware/CI runner, date, command, and commit. Clearly separate measurements from
  asymptotic guarantees and refresh results when algorithm kernels change materially.

AI documentation examples, if Graph is added to `ai-docs/src`, should be short real-world slices that link to this
guide. Run `pnpm ai-docgen` rather than editing generated `LLMS.md` files.

## Phases

### Phase 1: Contract fixtures and compatibility probes

1. Convert current DOT and Mermaid happy-path tests to exact deterministic output assertions.
2. Add fixtures for sparse indexes, callback invocation order, self-loops, directed and undirected parallel edges,
   empty labels, and mutable snapshots.
3. Add adversarial escaping/injection tables for every interpolated context.
4. Assert exact complete outputs and syntactic containment for every adversarial payload. Do not claim external parser
   conformance from these fixtures.

Verification: targeted `packages/effect/test/Graph.test.ts` tests fail for each demonstrated escaping defect and pass
for the unchanged baseline snapshots.

### Phase 2: Minimal emitter hardening

1. Split DOT and Mermaid escaping by syntactic context.
2. Fix only defects demonstrated in Phase 1 while retaining default headers, indentation, ordering, and delimiters.
3. Preserve one statement per edge and ensure all endpoints use the validated node-ID table.
4. Update emitter JSDoc to state literal-label, ordering, complexity, security, and renderer compatibility contracts.

Verification: targeted exact-output unit tests, `pnpm lint-fix`, `pnpm check`, and
`pnpm doctest --run packages/effect/src/Graph.ts`.

### Phase 3: Focused additive options

1. Add custom node IDs, indentation, and line-separator options to both emitters.
2. Add canonical graph/node/edge DOT attributes with typed values and no raw fragments.
3. Add type tests for both overload styles, callback inference, readonly attributes, and invalid option values.
4. Keep output groups deferred under the no-hierarchy scope.
5. Evaluate Mermaid v11 edge IDs separately. They must be opt-in and version-explicit if accepted.

Verification: `pnpm test-types Graph`, targeted exact-output Graph unit tests, doctests, `pnpm lint-fix`, and
`pnpm check`.

### Phase 4: Performance and publication

1. Add representative emitter benchmarks using shared seeded graph fixtures from the verification/benchmark plan.
2. Confirm linear scaling and callback counts; optimize only measured regressions.
3. Publish reproducible results in the location linked by the Graph guide, including environment metadata.

Verification: benchmark command documented with its seed and fixture sizes; results reproducible in CI or the
repository's standard benchmark environment.

### Phase 5: Consolidated documentation

1. Audit final semantics and actual implementations from all completed Graph plans.
2. Write the guide, complexity table, algorithm-choice guide, mutation lifecycle, multiedge/self-loop discussion,
   persistence link, emitter compatibility contract, and benchmark publication section.
3. Replace repetitive emitter JSDoc examples with a small progression of deterministic runnable examples and links to
   the guide.
4. Regenerate documentation artifacts through their generators.

Verification: `pnpm lint`, targeted doctests for changed source files, `pnpm ai-docgen` if applicable, link checking,
and review of generated diffs.

## Tests and Doctests

Required unit coverage in `packages/effect/test/Graph.test.ts`:

- exact empty and populated output for both graph kinds;
- stable node/edge ordering before and after deletion/addition;
- all supported Mermaid shapes and directions against the documented syntax fixtures;
- custom labels, IDs, DOT attributes, indentation, and line separators in data-first and data-last use;
- duplicate custom IDs;
- empty, whitespace-only, multiline, Unicode, control-character, and long labels;
- separate directed/undirected self-loop and parallel-edge fixtures;
- table-driven structural injection payloads for every output context;
- callback count and invocation order on immutable and mutable graphs;
- large fixture sanity tests that assert size/line counts without storing huge snapshots.

Required type coverage in `packages/effect/typetest/Graph.tst.ts`:

- generic inference for new node/edge attribute callbacks;
- preservation of graph kind and mutable/immutable acceptance in both overload styles;
- readonly attribute maps and the closed `lineSeparator` union;
- no accidental widening of existing label/shape callback parameters.

Runnable JSDoc examples should demonstrate one default export and one additive customization per format, with exact
semantic string/line assertions. Keep security matrices and large outputs in unit tests, not JSDoc.

## Changesets

- Escaping changes that alter emitted runtime text require an `effect` patch changeset describing the invalid-output or
  injection bug and the affected characters.
- New exported option fields/types are additive public API and require an `effect` minor changeset unless maintainers
  choose the repository's patch policy for additive APIs.
- Documentation-only consolidation, benchmark-result refreshes, and test-only exact-output infrastructure do not need a
  changeset.
- Keep hardening and additive options in separate changesets when they can ship independently.

## Dependencies and Ownership

Required before implementation:

- the correctness-contract plan must fix shared ordering, self-loop, parallel-edge, and lookup semantics;
- the verification/benchmark foundation must own seeded fixtures, benchmark harness conventions, and publication
  metadata;
- the Schema/persistence plan must own serialized snapshots, hydration, index preservation, and the guide's persistence
  target.

Can proceed independently after correctness contracts:

- emitter escaping fixtures and hardening;
- Mermaid syntax fixtures;
- additive output-only options that use public node/edge iteration;
- emitter microbenchmarks.

Must wait for the wider Graph program:

- the final complexity table and algorithm-choice guide, because they must describe implemented kernels rather than
  planned APIs;
- published benchmark comparisons across algorithms;
- final cross-links to Schema persistence and Effect-native interruption documentation.

This plan does not own shared dense snapshots, arc iterators, algorithm validation, path reconstruction, interruption,
or persistence internals. The emitters should not depend on those facilities.

## Explicit Non-Goals

- DOT or Mermaid parsers, round-trip converters, or syntax-preservation bags.
- Any output format other than existing DOT and Mermaid flowchart/graph syntax.
- Layout engines, rendering, SVG/HTML generation, rank calculation, routing, or visual geometry such as coordinates,
  dimensions, splines, colors derived from geometry, and label positions.
- Ports, compass points, record endpoints, HTML labels, hierarchy, compound nodes, nested subgraphs, cluster-edge
  semantics, or subgraph endpoints.
- Mermaid sequence, state, class, ER, mindmap, block, Ishikawa, timeline, or other diagram dialects.
- Raw statements, raw attributes, directives, click handlers, links, scripts, styles, themes, or renderer
  initialization blocks.
- Strict DOT, edge deduplication, multiedge coalescing, or endpoint canonicalization.
- A generic formatter/plugin abstraction, streaming API, asynchronous emitter, or custom user-defined format.
- Persistence or JSON serialization beyond linking to the separate Schema plan.
