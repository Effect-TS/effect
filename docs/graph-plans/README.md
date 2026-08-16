# Graph Improvement Plans

This directory coordinates non-breaking improvements to `packages/effect/src/Graph.ts` based on lessons from
`.repos/graph`.

The binding cross-plan decisions, ownership tables, dependency DAG, delivery waves, and gates are in the
[master roadmap](./12-master-roadmap.md). If a domain plan conflicts with that document, the master roadmap wins.

## Plan Index

| Plan | Topic |
| --- | --- |
| [01](./01-correctness-contracts.md) | Correctness contracts and semantic hardening |
| [02](./02-verification-benchmarks.md) | Verification and benchmark foundations |
| [03](./03-internal-architecture-performance.md) | Internal architecture and performance |
| [04](./04-core-queries-transforms.md) | Core queries and transforms |
| [05](./05-traversal-paths.md) | Traversal and paths |
| [06](./06-connectivity-dag-algorithms.md) | Connectivity and DAG algorithms |
| [07](./07-optimization-algorithms.md) | Optimization algorithms |
| [08](./08-analytics.md) | Analytics and specialist algorithms |
| [09](./09-generators.md) | Graph generators |
| [10](./10-effect-native-interruption.md) | Effect-native interruption and cooperative scheduling |
| [11](./11-dot-mermaid-documentation.md) | DOT, Mermaid, and consolidated documentation |
| [12](./12-master-roadmap.md) | Binding master roadmap |
| [13](./13-current-execution-plan.md) | Current implementation status and execution order |
| [14](./14-pr-delivery-plan.md) | Pull-request split, dependencies, and merge waves |
| [15](./15-agent-execution-prompt.md) | Reusable delivery-agent prompt with selectable task groups |

## Scope

- Preserve all existing public signatures and behavior unless a regression test demonstrates a bug.
- Keep only directed and undirected graph kinds.
- Preserve scoped mutation and automatic monotonic numeric node and edge indexes.
- Preserve parallel edges, self-loops, stable index ordering, and deterministic traversal.
- Keep synchronous APIs synchronous. Any Effect-returning variants must be additive.
- Keep output support limited to DOT and Mermaid.
- Do not add mixed or bidirectional edges, layout engines, custom formats, a plain mutable JSON model, freezing,
  proxies, or property-descriptor tricks.
- Schema serialization has a separate plan and is out of scope here, except for coordination around internal graph
  snapshots and hydration.

## Shared Semantics

- Neighbor-node queries return unique node indexes. Incident-edge queries preserve every edge occurrence.
- Directed self-loops contribute once to in-degree and once to out-degree. Undirected self-loops contribute two to
  graph-theoretic degree.
- Parallel edges contribute independently to degree, paths, capacity, flow, and weighted analysis.
- A self-loop is a cycle. Two parallel undirected edges form a cycle.
- Default ordering follows node and edge insertion/index order. No API implicitly sorts unless documented.
- Missing safe lookups return `Option.none`; empty collection queries return empty collections; invalid structural or
  algorithmic inputs use `GraphError`.
- Expensive multi-result APIs should be genuinely lazy first, with eager forms collecting the lazy form.
- New public functions follow Effect dual/data-first/data-last conventions and require JSDoc, tests, and a changeset.

## Shared Internal Groundwork

Plans should coordinate around these internal concepts rather than creating competing representations:

1. An ordered arc iterator for outgoing, incoming, and direction-ignored traversal that retains both neighbor and
   `EdgeIndex`.
2. An optional dense snapshot translating sparse stable public indexes to dense positions for hot algorithms.
3. Shared weight, capacity, and heuristic validation policies.
4. Shared predecessor/path reconstruction that retains edge identity internally.
5. A no-op synchronous checkpoint abstraction that can also support additive Effect-native interruption.
6. Seeded graph fixtures and oracle adapters shared by correctness, property, differential, and benchmark suites.

## Dependency Order

1. Correctness contracts.
2. Verification and benchmark foundations.
3. Internal architecture and performance kernel.
4. Core queries and transforms.
5. Traversal and path features.
6. Connectivity and DAG algorithms.
7. Optimization algorithms.
8. Analytics and graph generators.
9. Effect-native interruption after synchronous kernels stabilize.
10. DOT, Mermaid, and consolidated documentation can proceed after shared semantics are fixed.

Each domain plan must state which earlier plans it requires, which work can proceed independently, and which APIs or
internal helpers it expects another plan to own.
