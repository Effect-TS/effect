# Plan 10: Effect-Native Interruption and Cooperative Scheduling

## Status and intent

Add Effect-returning variants for graph algorithms that can occupy a JavaScript thread for a meaningfully long time.
The variants must cooperate with Effect fiber interruption and scheduling without adding `AbortSignal`, changing an existing
synchronous signature, or changing deterministic results.

This work starts only after the synchronous kernels from plans 03 and 05-09 are stable. It is not a request to put every
graph operation inside `Effect.sync`: doing so makes an operation nominally effectful but does not make a running JavaScript
loop interruptible.

## Decisions

### Public naming and shape

- Name an Effect-returning counterpart by appending `Effect` to the existing synchronous name: for example,
  `floydWarshallEffect`, `betweennessCentralityEffect`, and `maxFlowEffect`.
- Keep the synchronous function as the canonical base name. Do not rename, deprecate, or change it.
- Preserve the synchronous function's argument order, result type, graph-kind constraints, configuration, and dual
  data-first/data-last overloads. The Effect counterpart has the same dual arity and returns
  `Effect.Effect<Result, GraphError>`.
- Do not add `signal`, `AbortSignal`, `AbortController`, cancellation callbacks, or an interruption error to public options.
  Callers use normal Effect composition such as `Fiber.interrupt`, `Effect.timeout`, races, scopes, and parent-child
  interruption.
- Do not add a generic `runAlgorithmEffect(name, ...)` dispatcher. Named exports remain discoverable, tree-shakeable, and
  strongly typed.
- Do not add a public checkpoint frequency option initially. A user-facing knob would expose kernel mechanics, make latency
  guarantees hard to document, and destabilize benchmark comparisons. Tune internal constants from measurements instead.

The `Effect` suffix follows the repository convention for an effectful counterpart of an otherwise pure or synchronous
operation. `Interruptible`, `Async`, and `Cooperative` are rejected: interruption is a property of Effect execution, no
Promise or worker is introduced, and scheduling cooperation is an implementation detail.

### Errors and interruption

- Algorithm and input failures already represented by `GraphError` are failures in the Effect error channel. The
  synchronous API continues to throw the same `GraphError` at the same logical point.
- Fiber interruption is interruption in the Effect `Cause`; it is not `GraphError`, `Option.none`, a partial result, or a
  bespoke `GraphInterruptedError`. Consequently `Effect.catch` does not accidentally turn cancellation into an algorithm
  result.
- Kernel validation should return an internal failure outcome instead of throwing where practical. The synchronous adapter
  throws that `GraphError`; the Effect adapter fails with it. This keeps the two adapters over one decision path.
- Exceptions thrown by user-supplied weight, capacity, heuristic, matching, or other callbacks retain the established
  synchronous semantics. They become defects in an Effect variant unless the owning synchronous plan explicitly models
  them as `GraphError`; do not catch every unknown throwable and mislabel it as an algorithm error.
- Interruption discards private partial state. No partially constructed collection, flow, partition, or matrix is published.
  Normal garbage collection is sufficient because these kernels acquire no scoped resources.

### Why a resumable kernel is required

`Effect.sync(() => synchronousAlgorithm(...))` only observes interruption before or after the callback. The fiber runtime
cannot suspend or interrupt the callback while its loop owns the JavaScript thread. Likewise, invoking a callback named
`checkpoint` from a synchronous stack cannot `yield* Effect.yieldNow`.

For each admitted algorithm, separate its state from its driving loop:

```ts
interface AlgorithmCheckpoint {
  readonly shouldPause: (work: number) => boolean
}

type KernelStep<A> =
  | { readonly _tag: "Continue" }
  | { readonly _tag: "Done"; readonly value: A }
  | { readonly _tag: "Failure"; readonly error: GraphError }
```

The exact internal names are owned by plan 03 and may differ. The required semantics are:

- Kernel state survives a `Continue` result and resumes without recomputation.
- Kernels consult one shared, internal checkpoint hook only at invariants-safe boundaries.
- The synchronous adapter supplies a no-op checkpoint and drains the kernel in one call path.
- The Effect adapter supplies a budget checkpoint, runs one bounded synchronous slice, and on `Continue` executes
  `Effect.yieldNow` before resuming. Implement Effect drivers with the repository's preferred untraced Effect function
  pattern and stack-safe suspension, not `async` / `await` or Promises.
- A slice must not mutate the public graph. It may mutate only private kernel state and newly allocated result structures.
- Do not duplicate an algorithm into separate synchronous and Effect implementations. Deterministic parity depends on both
  adapters advancing the same kernel state machine.

Plan 03 owns the reusable checkpoint protocol and driver helpers. Domain plans own the resumable state for their kernels.
If plan 03 instead lands a generator/stepper protocol with these properties and acceptable synchronous overhead, reuse it;
do not introduce a competing abstraction in this plan.

### Checkpoint granularity and yielding

Checkpoints represent logical work, not wall-clock time. Do not use `Date.now`, `new Date`, timers, or `Clock` in hot loops.
Logical budgets make output and tests deterministic and avoid a clock read for every edge.

Initial checkpoint boundaries by kernel family:

| Family | Safe checkpoint boundary | Work charged |
| --- | --- | --- |
| Floyd-Warshall / dense all-pairs | Completed row for a fixed intermediate node; split a row into fixed column blocks when dense benchmarks exceed the latency target | Relaxation attempts |
| Repeated-source all-pairs, closeness, betweenness | Completed source traversal; allow queue/stack blocks inside one source for very large components | Examined arcs plus queue pops |
| Simple paths, simple cycles, isomorphism, exact coloring/TSP | A fixed block of search-state expansions, after restoring the explicit DFS/backtracking invariant | Candidate expansions and examined arcs |
| PageRank, HITS, eigenvector, Katz | Fixed node blocks within an iteration, with convergence checked only after the complete iteration | Node/arc updates |
| Louvain, label propagation, greedy modularity | Fixed node blocks after a committed move, plus phase/pass boundaries | Candidate community evaluations |
| Girvan-Newman | Source blocks while recomputing betweenness and completed edge-removal rounds | Traversal/relaxation work |
| Max-flow / min-cut | Fixed blocks while searching the residual graph and after a complete augmentation | Residual arcs examined |
| Bellman-Ford and similarly repeated relaxations | Fixed edge blocks, preserving pass state, and completed passes | Relaxation attempts |
| Dominators | Completed DFS/search blocks or semidominator buckets, only where the implementation's invariants permit | Nodes/arcs examined |

Start with a slice budget calibrated to keep interruption latency below 5 ms on supported CI benchmark hardware for the
large seeded fixtures. Also enforce a logical upper bound so one high-degree node, one dense row, or one backtracking branch
cannot create an unbounded slice. Calibration belongs in benchmarks, not a public API.

Yield exactly once after an exhausted slice. Do not yield after every edge, node, emitted result, or callback; that would
dominate useful work. Do not use `Effect.sleep(0)` or a fixed delay. `Effect.yieldNow` delegates fairness to the active
scheduler and creates an interruptible boundary. Effect's ordinary runtime operation budget is not a substitute because a
large synchronous slice is one Effect runtime operation.

Run initial validation and trivial early returns before the first forced yield, while still allowing pre-start fiber
interruption through normal Effect evaluation. A computation that completes within one slice should not pay an extra
scheduler turn.

### Progress reporting

Do not add progress callbacks, a progress service, or progress events in the first release.

- Several target algorithms have no honest total: backtracking search, convergence algorithms, Louvain phases, and
  augmenting-path flow can revise the amount of remaining work.
- Calling user code at checkpoints complicates error/environment types and can perturb scheduling and determinism.
- Streaming multi-result algorithms already communicate useful progress by producing results lazily; aggregate algorithms
  can be observed externally by fiber lifecycle, metrics around the whole Effect, and tracing.

Reconsider a separate, algorithm-specific progress API only after a concrete use case defines stable semantic units. Do not
encode internal checkpoint counts as a public progress contract.

## Admission policy

An algorithm receives an Effect variant when at least one of these is true:

- its normal implementation is cubic, repeated-source, iterative-to-convergence, repeated augmentation, or exponential;
- it has an unbounded search space or can spend substantial time before producing its next lazy result;
- seeded benchmarks show a representative supported input can hold the thread for at least 8 ms.

The benchmark criterion prevents complexity notation alone from creating wrappers around operations that are fast in
practice. Reassess admission when plans 05-09 finalize names and implementations.

### Initial variants

- **All-pairs and repeated relaxation:** `floydWarshallEffect`, any Johnson/repeated-source all-pairs counterpart introduced
  by plan 05, and `bellmanFordEffect`. Single-pair Dijkstra and A* are admitted only if the large sparse benchmark crosses
  the runtime threshold; they are not automatic variants.
- **Enumerative search:** Effect variants for eager simple-path, simple-cycle, and k-shortest-simple-path collection APIs
  from plan 05. Their lazy API remains the preferred way to bound results. If plan 05 exposes an Effect-native `Stream`, use
  that stream as the interruptible collection kernel rather than adding another eager implementation. Ensure interruption
  can occur while searching for the next result, not only between emitted results.
- **Centrality:** closeness and betweenness, plus PageRank, HITS, eigenvector, and Katz variants from plan 08. Degree,
  in-degree, and out-degree centrality are linear aggregations and do not receive variants absent benchmark evidence.
- **Community:** Louvain, label propagation, Girvan-Newman, and greedy modularity variants from plan 08. A direct modularity
  score calculation does not receive one unless benchmarks justify it.
- **Optimization:** max-flow and min-cut variants from plan 07, sharing one resumable residual-network kernel. Add variants
  for exact TSP, exact coloring, or other exponential optimization only if those APIs are accepted by plans 07-08.
- **Matching/isomorphism:** graph and subgraph isomorphism/backtracking variants from plan 07 or 08. Maximum bipartite
  matching receives a variant only if its finalized kernel crosses the threshold on benchmark fixtures.
- **DAG/connectivity:** dominator-tree variants from plan 06 only if the finalized implementation has measurable long
  uninterrupted phases. Connected components, SCCs, bridges, articulation points, topological sorting, acyclicity,
  bipartiteness, planarity, core numbers, and ordinary traversals stay synchronous and/or lazy by default.

### Explicit non-targets

Do not add Effect variants for node/edge lookup, degree queries, neighbors, mutation, graph construction, map/filter,
composition, set-like transforms, serialization, DOT/Mermaid output, ordinary BFS/DFS iteration, or small single-path
convenience calls merely for API symmetry. Users can place a fast synchronous call in `Effect.sync` when composition alone
is useful; this plan is specifically for cooperative CPU work.

## Phases

### Phase 1: Inventory after synchronous kernels stabilize

1. Read the final APIs, semantics, fixtures, and benchmarks from plans 03 and 05-09.
2. Benchmark all candidates on seeded sparse, dense, parallel-edge, self-loop, disconnected, and adversarial fixtures.
3. Record admitted exports and rejected candidates with measured rationale. Do not implement an Effect wrapper before its
   synchronous kernel and deterministic contract are complete.
4. Identify the invariant-safe checkpoint boundaries in each admitted kernel and any single inner operation that violates
   the target slice latency.

### Phase 2: Shared resumable driver

1. Extend plan 03's no-op synchronous checkpoint abstraction into the minimal resumable kernel/driver protocol described
   above.
2. Prove it with one structurally simple repeated-work kernel, preferably Floyd-Warshall or Bellman-Ford, before migrating
   backtracking or community algorithms.
3. Keep the synchronous adapter allocation-free per checkpoint and verify that the Effect driver yields only when its
   logical budget is exhausted.
4. Establish benchmark and interruption-latency harnesses shared by all later migrations.

### Phase 3: Paths and optimization

1. Migrate admitted all-pairs/repeated-relaxation kernels owned by plan 05.
2. Migrate simple-path/cycle search so explicit search state survives between slices and lazy result ordering is unchanged.
3. Migrate flow/min-cut and admitted matching/isomorphism/optimization kernels owned by plan 07.
4. Add parity, interruption, fairness, and overhead tests per family before moving to analytics.

### Phase 4: Analytics and community

1. Migrate centrality and iterative ranking kernels from plan 08, preserving convergence checks and floating-point update
   order exactly.
2. Migrate community kernels from plan 08, preserving seeded/default ordering and committing node moves atomically between
   checkpoints.
3. Add dominator or other plan 06/09 candidates only when Phase 1 measurements admitted them.
4. Re-run the full candidate inventory; do not add variants solely to make naming tables symmetrical.

### Phase 5: Public API, documentation, and release

1. Add JSDoc for each new export explaining that it is cooperatively scheduled, fiber-interruptible, deterministic, and
   semantically equivalent to its synchronous counterpart.
2. Include examples using ordinary fiber interruption or `Effect.timeout`; never demonstrate `AbortController`.
3. Add a guide choosing among synchronous, lazy/streaming, and Effect variants. State that interruption latency is bounded
   by a slice, not an immediate preemption of JavaScript.
4. Run code generation if generated barrels are affected, API/type tests, targeted doctests, lint, and package type checks.
5. Add a patch changeset for `effect` describing the additive exports. If the variants land over multiple pull requests,
   each public batch gets its own changeset; internal kernel preparation alone does not.

## Verification

### Deterministic parity

For every variant, assert deep semantic equality with the synchronous result on the same seeded fixtures, including:

- empty, singleton, disconnected, directed, and undirected graphs where supported;
- sparse stable indexes, parallel edges, self-loops, ties, unreachable nodes, and negative weights where valid;
- deterministic path/cycle/result ordering and edge identity;
- identical convergence output and floating-point values, not merely approximate agreement caused by reordered updates;
- identical `GraphError` reason/message for invalid endpoints, weights, capacities, heuristics, graph kinds, and negative
  cycles;
- more than one slice, so parity tests exercise resume boundaries rather than only the one-shot path.

Use seeded fixtures and oracle adapters owned by plan 02, plus plan 03's internal checkpoint probes. Add type tests proving dual invocation and the exact
`Effect.Effect<Result, GraphError>` shape.

### Fiber interruption and scheduling

- Use `it.effect`, fork the algorithm into a child fiber, wait until a deterministic test hook reports at least one
  checkpoint/yield, interrupt the fiber, and assert an interrupted `Exit`/`Cause` rather than a typed failure.
- Do not use graph size plus arbitrary real sleeps to guess whether work started. Expose the checkpoint observer only to
  tests or use a deterministic test scheduler/harness; do not make it public API.
- Use `TestClock` for timeout-based tests and advance it explicitly. Keep a direct `Fiber.interrupt` test as the primary
  proof because cooperative yielding itself is scheduler-driven rather than time-driven.
- Verify interruption before start, after several resumptions, and during each major multi-phase family. Verify no result is
  published and no public graph mutation occurs.
- Run a competing fiber that increments a counter between slices to prove fairness. Completion of both fibers alone is not
  sufficient evidence that the algorithm yielded.
- Verify a small computation that fits in one slice completes without an unnecessary yield.

### Performance budgets

Compare against the stabilized synchronous baseline using the benchmark harness from plan 03:

- Existing synchronous APIs: median runtime regression at most 5% and no more than one additional allocation per whole
  invocation attributable to resumable state; investigate noise with repeated benchmark runs.
- Effect variants without contention: median CPU/runtime overhead at most 20% over the same resumable synchronous kernel on
  large fixtures. Report scheduler-turn count with the timing.
- Cooperative latency: no measured slice above 5 ms on the designated CI fixture/hardware, with a logical-work cap guarding
  pathological high-degree/search cases.
- Memory: peak retained state no more than 10% above the synchronous kernel excluding unavoidable Effect runtime/fiber
  objects and the final result. Enumeration tests must remain bounded by explicit fixture/result limits.

If the synchronous budget cannot be met, do not ship a duplicated slow kernel or silently loosen the budget. First move
checkpoint checks outward, reduce allocations, or specialize the no-op driver. If that still fails, keep the synchronous
kernel unchanged and defer that Effect variant until a resumable design meets both parity and overhead requirements.

## Dependencies and ownership

- **Plans 02 and 03 are required:** plan 02 owns benchmark foundations and seeded fixtures; plan 03 owns dense snapshots,
  ordered arc iteration, and the shared no-op checkpoint/resumable driver. This plan must not create alternate graph
  snapshots or fixture systems.
- **Plan 05 is required:** it owns traversal/path semantics, lazy simple paths/cycles, all-pairs choices, and path
  ordering. Plan 03 owns shared path reconstruction. Effect variants adapt those kernels after stabilization.
- **Plan 06 is required for DAG/connectivity candidates:** it owns dominators and decides whether any finalized multi-phase
  connectivity kernel is eligible. Most linear connectivity APIs remain outside this plan.
- **Plan 07 is required:** it owns flow, min-cut, matching, isomorphism, and optimization semantics, validation, and kernels.
- **Plan 08 is required:** it owns centrality, ranking, community, convergence, seeded behavior, and generator algorithms.
- **Plan 09 is required:** consume any final expensive algorithm kernels and consolidated benchmark decisions it introduces;
  interruption remains last in the dependency order and must not force premature API choices upstream.

Work that can proceed independently is limited to the candidate inventory, naming/type design, generic driver prototype,
test harness design, and performance thresholds. Public exports and domain kernel migrations wait for their owning plans.

## Completion criteria

- Every shipped Effect variant is genuinely interruptible during expensive work and yields cooperatively.
- Existing synchronous signatures, results, errors, ordering, and performance budgets remain intact.
- Both adapters use one deterministic kernel; no `AbortSignal` code or duplicate algorithm exists.
- Typed `GraphError` failures and fiber interruption are observably distinct.
- Tests prove multi-slice parity, deterministic interruption, scheduler fairness, and bounded checkpoint overhead.
- Documentation explains when not to use an Effect variant, and all additive public APIs have JSDoc, type coverage, and an
  `effect` changeset.
