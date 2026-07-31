# Documentation Example Audit

Date: 2026-07-31

## Executive summary

This audit reviewed documentation examples in public TypeScript source JSDoc under `packages/**/src/**/*.ts`. It combined
a static inventory of every TypeScript-family fence with contextual review of the surrounding API, prose, signature,
implementation, and execution boundary.

The source JSDoc baseline is strong: 3,387 of 3,389 TypeScript examples are marked runnable and 3,280 contain semantic
`// =>` assertions. Passing doctests do not, however, prove that an example teaches the documented API. The review found
examples that pass while calling the wrong API, depending on scheduling accidents, or asserting too weak a projection.
The highest-value response is not a broad rewrite. It is to fix the verified defects, add behavior-oriented examples to
selected high-value APIs, and track example quality by semantic behavior rather than raw example count.

## Method and boundaries

The review followed `AGENTS.md`, `.patterns/jsdoc.md`, `.patterns/testing.md`, and
`packages/tools/doctest/README.md`. `packages/effect/src/Array.ts` was used as the reference for direct semantic assertions,
dense expected arrays, and setup/assertion separation.

The static inventory included `packages/**/src/**/*.ts`, excluding `internal/` and generated `index.ts` barrels from
public-API coverage counts. Markdown guides, `docs/`, and `ai-docs/` are outside this report's scope.

The exported-API count below is a syntactic count of exported declarations, not a product requirement that every export
must have its own example. Namespace members, low-level contracts, and generated provider declarations make the raw
denominator intentionally conservative. Findings were reported only after contextual review; static matches are triage
signals, not defects.

## Follow-up status

The audit was followed by a principle-driven improvement pass across the affected source documentation. The pass fixed the
verified DateTime and Channel documentation defects, removed exact type-witness tautologies, and improved examples across
collection, effect, resource, error, schema, metric, queue, and satellite modules. Runtime and API defects exposed by the
review were split into focused PRs: [#6820](https://github.com/Effect-TS/effect/pull/6820),
[#6821](https://github.com/Effect-TS/effect/pull/6821), [#6822](https://github.com/Effect-TS/effect/pull/6822), and
[#6823](https://github.com/Effect-TS/effect/pull/6823). The findings below remain the original audit record, with resolution
notes where applicable.

## Verified findings

### Critical

1. **Runtime defect exposed by a coverage gap: the data-first overload of `Stream.mapAccumArrayEffect` is broken.**
   The example at [`Stream.ts:7403`](../../packages/effect/src/Stream.ts#L7403) exercises only data-last use. The overload at
   [`Stream.ts:7434`](../../packages/effect/src/Stream.ts#L7434) promises data-first use, but dispatch at
   [`Stream.ts:7442`](../../packages/effect/src/Stream.ts#L7442) calls `isStream(args)` instead of `isStream(args[0])`.
   Direct execution of the data-first form returns a function rather than a `Stream`.

   **Resolved in [#6823](https://github.com/Effect-TS/effect/pull/6823):** the dispatch checks `args[0]`, with a focused
   data-first regression test and patch changeset.

### High

2. **Correctness defect: `DateTime.now` and `DateTime.nowAsDate` test each other.**
   The `now` example calls `nowAsDate` at [`DateTime.ts:815`](../../packages/effect/src/DateTime.ts#L815), while the
   `nowAsDate` example calls `now` at [`DateTime.ts:832`](../../packages/effect/src/DateTime.ts#L832). Both doctests pass,
   masking that neither example demonstrates its documented API.

   **Resolved:** each example now calls its documented API.

3. **Correctness defect: the `Channel.merge` observation contradicts `haltStrategy: "either"`.**
   [`Channel.ts:6287-6293`](../../packages/effect/src/Channel.ts#L6287) promises all six outputs after selecting `"either"`.
   The implementation completes when either side completes at
   [`Channel.ts:6397-6399`](../../packages/effect/src/Channel.ts#L6397), potentially interrupting the other side. The
   synchronous inputs happen to emit before completion. Use the default/`"both"` strategy for complete collection, or
   redesign the example to teach early termination.

   **Resolved:** the example now uses the default `"both"` strategy and removes unrelated error scaffolding.

### Medium

4. **Contract defect: `ChannelSchema.decodeUnknown` is documented as accepting unknown input but remains typed as
   `S["Encoded"]`.** The prose at [`ChannelSchema.ts:115-126`](../../packages/effect/src/ChannelSchema.ts#L115) promises an
   intentionally unknown boundary; the signature at [`:133-143`](../../packages/effect/src/ChannelSchema.ts#L133) is an
   alias of `decode` and preserves `S["Encoded"]`. This needs maintainer confirmation on whether the type or prose is the
   intended contract.

   **Resolved in [#6820](https://github.com/Effect-TS/effect/pull/6820):** historical behavior and adjacent unknown-boundary
   APIs confirmed the prose; the input type accepts `unknown`, with runtime and type-level regression tests.

5. **Guideline ambiguity: 23 runnable source examples use `Effect.runSync`.**
   These occur in [`Path.ts:69`](../../packages/effect/src/Path.ts#L69),
   [`Pipeable.ts:38`](../../packages/effect/src/Pipeable.ts#L38),
   [`Schema.ts:477`](../../packages/effect/src/Schema.ts#L477), and throughout
   [`Scope.ts:39-479`](../../packages/effect/src/Scope.ts#L39). The prior testing rule did not distinguish unit tests from
   documentation whose subject is synchronous execution.

   **Resolved as policy:** unit tests still prohibit `Effect.runSync`; runnable documentation may use it only when
   synchronous execution is the contract or materially improves a known-synchronous example.

6. **Existing-guideline violation: type-level examples use tautological runtime assertions.**
   Examples include [`Crypto.ts:31-32`](../../packages/effect/src/Crypto.ts#L31),
   [`Channel.ts:6261-6262`](../../packages/effect/src/Channel.ts#L6261),
   [`String.ts:129`](../../packages/effect/src/String.ts#L129), and
   [`Predicate.ts:141`](../../packages/effect/src/Predicate.ts#L141). Keep `import.meta.vitest` so docgen checks the type,
   but do not assert that a literal remains itself.

   **Resolved:** the known witnesses were normalized. This remains an editorial guideline rather than a doctest diagnostic.

7. **Existing-guideline violation: live-clock examples are nondeterministic.**
   Live-clock assumptions appear at [`DateTime.ts:1392-1474`](../../packages/effect/src/DateTime.ts#L1392).

   **Resolved:** effectful comparisons now use `TestClock`; inherently live unsafe examples are explicitly non-runnable.

8. **Existing-guideline violation: runnable-looking test registration is not collected.**
   [`packages/vitest/src/index.ts:182-216`](../../packages/vitest/src/index.ts#L182) uses a plain fence, wraps tests in an
   uncalled function, and never validates the documented layer behavior. Registration examples should use
   top-level collection, while the doctest collector executes runnable snippets inside tests.

   **Resolved by classification:** the example now uses a plain non-runnable fence, invokes registration directly, and uses
   `assert` from `@effect/vitest`.

## Judgment-based findings

These recommendations require editorial judgment. They are not correctness defects.

1. **Execution-only does not always mean pedagogically complete.** The 107 runnable source examples without `// =>`
   include legitimate type-only examples, but also examples that merely finish without proving the documented
   behavior. Schema middleware examples at [`Schema.ts:5251-5260`](../../packages/effect/src/Schema.ts#L5251) and
   [`:5318-5327`](../../packages/effect/src/Schema.ts#L5318) log output and discard the result. `Stream.share` at
   [`Stream.ts:8688-8701`](../../packages/effect/src/Stream.ts#L8688) produces behavior indistinguishable from rerunning a
   cold stream because its consumers do not overlap.

   **Resolved in the identified examples:** schema middleware now captures deterministic events, and `Stream.share` now
   demonstrates overlapping consumers and a single shared acquisition.

2. **Some assertions project away the contract being taught.** The asynchronous-defect example at
   [`Effect.ts:9149-9155`](../../packages/effect/src/Effect.ts#L9149) checks only `Exit._tag === "Failure"`; it does not show
   that the failure is a defect rather than a typed error. `Sink.toChannel` at
   [`Sink.ts:299-311`](../../packages/effect/src/Sink.ts#L299) checks only `Channel.isChannel`, hiding input consumption,
   leftovers, completion, and failures.

   **Resolved in the identified examples:** the asynchronous defect example verifies a `Die` cause, while `Sink.fromChannel`
   and `Sink.toChannel` now demonstrate completion behavior.

3. **Incidental scaffolding obscures the API.** `Metric` examples at
   [`Metric.ts:1591-1631`](../../packages/effect/src/Metric.ts#L1591),
   [`:3174-3229`](../../packages/effect/src/Metric.ts#L3174), and
   [`:3315-3364`](../../packages/effect/src/Metric.ts#L3315) introduce unused error models and multiple unrelated programs.
   `Channel.merge` similarly declares an unused `MergeError` at
   [`Channel.ts:6277-6281`](../../packages/effect/src/Channel.ts#L6277). Generic error parameters should remain `never`
   unless the example actually exercises the error path.

   **Resolved in the reviewed modules:** Metric and Channel examples no longer introduce the identified fictional errors.

4. **Side-effect examples often narrate rather than observe.** Logging reference examples at
   [`References.ts:201-228`](../../packages/effect/src/References.ts#L201) and
   [`:331-358`](../../packages/effect/src/References.ts#L331) do not emit and capture logs, so the documented severity and
   filtering behavior remain invisible.

   **Resolved:** both references now capture emitted log levels with a local public `Logger` implementation.

## Inventory

### Public source JSDoc by package

“Exports covered” means a syntactically exported declaration has an immediately associated JSDoc code fence. It is a
triage metric, not a quality score. The table is the pre-improvement audit baseline; follow-up edits intentionally removed
some redundant examples, so it should not be read as the final post-change count.

| Package                | Modules | Modules with examples | TS examples |  Runnable | With `// =>` | Execution-only |   Exports covered |
| ---------------------- | ------: | --------------------: | ----------: | --------: | -----------: | -------------: | ----------------: |
| `effect`               |     337 |                   164 |       3,364 |     3,363 |        3,256 |            107 |     3,116 / 7,143 |
| `ai`                   |      28 |                     0 |           0 |         0 |            0 |              0 |           0 / 319 |
| `atom`                 |       6 |                     1 |           2 |         2 |            2 |              0 |            2 / 33 |
| `opentelemetry`        |       6 |                     1 |           1 |         1 |            1 |              0 |            1 / 36 |
| `platform-browser`     |      17 |                     0 |           0 |         0 |            0 |              0 |            0 / 87 |
| `platform-bun`         |      22 |                     0 |           0 |         0 |            0 |              0 |            0 / 36 |
| `platform-deno`        |      21 |                     2 |           2 |         2 |            2 |              0 |            2 / 59 |
| `platform-node`        |      25 |                     0 |           0 |         0 |            0 |              0 |            0 / 56 |
| `platform-node-shared` |      12 |                     0 |           0 |         0 |            0 |              0 |            0 / 38 |
| `sql`                  |      27 |                     0 |           0 |         0 |            0 |              0 |           0 / 165 |
| `tools`                |      63 |                     8 |          20 |        19 |           19 |              0 |          20 / 284 |
| `vitest`               |       1 |                     0 |           0 |         0 |            0 |              0 |            0 / 20 |
| **Total**              | **565** |               **176** |   **3,389** | **3,387** |    **3,280** |        **107** | **3,141 / 8,276** |

### Module-level summary

The most example-heavy modules are `Effect` (237), `Stream` (227), `Array` (135), `Chunk` (86), `Schema` (86),
`Channel` (82), `DateTime` (82), `Graph` (69), `Cause` (62), and `Option` (61). Their density makes weak or duplicated
examples more important than adding more happy paths.

High-value stable modules with no example include `Brand`, `ChannelSchema`, `Differ`, `Effectable`, and `HashRing`.
Behavior-level gaps inside otherwise documented modules include `Sink.fromChannel`, the lifecycle semantics of
`Scope.use`, overlapping consumers for `Stream.share`, and data-first overload coverage for
`Stream.mapAccumArrayEffect`.

Large zero-example areas are package-shaped rather than isolated APIs: all 28 inventoried AI provider modules, all 17
browser platform modules, all 22 Bun platform modules, all 25 Node platform modules, all 12 node-shared modules, and all
27 SQL adapter modules have no source JSDoc examples. This does not imply one example per exported declaration. These
packages first need one introductory module/package progression that can be shared by adjacent adapters.

Within unstable Effect APIs, large zero-example modules include `unstable/ai/McpSchema`,
`unstable/httpapi/HttpApiEndpoint`, `unstable/http/HttpClientRequest`, `unstable/httpapi/HttpApiSchema`,
`unstable/http/HttpClient`, and `unstable/sql/Statement`. Prioritize these by API stability and the value of the behavior an
example would demonstrate, not by raw export count.

## Proposed guideline extension

The following examples are illustrative fragments. Whether a fence itself is runnable must still follow the existing
doctest metadata rules.

### 1. Classify the execution contract

**Rule:** Every example must be clearly one of: runnable observation, typechecked definition, test registration, runtime
entrypoint, or external-infrastructure illustration. Do not combine runtime or deployment alternatives in one executable
module.

**Motivation:** A reader must know whether copying the example starts a server, requires credentials, merely defines a
value, or is expected to terminate.

**Good:**

```ts
// node-main.ts
NodeRuntime.runMain(program)
```

**Counterexample:**

```ts
NodeRuntime.runMain(program)
BunRuntime.runMain(program)
```

**Exceptions/judgment:** Side-by-side fragments are acceptable when explicitly labeled as alternatives and not evaluated
together. **Mechanical enforcement:** partial; lint multiple `runMain` calls and evaluated `declare` values. Runtime intent
still requires review.

### 2. Make setup, operation, and observation scannable

**Rule:** Use setup, operation, observation order. Inline setup into the assertion when it remains readable; otherwise put
one blank documentation line before the observation block.

**Motivation:** Readers should identify the API under discussion and the semantic result without tracing incidental names.

**Good:**

```ts
const users = [{ name: "Ada", active: true }, { name: "Grace", active: false }]

Array.filter(users, (user) => user.active) // => [{ name: "Ada", active: true }]
```

**Counterexample:**

```ts
const input = [{ name: "Ada", active: true }]
const result = Array.filter(input, (item) => item.active)
result // => [{ name: "Ada", active: true }]
```

**Exceptions/judgment:** Keep a result binding for reuse, mutation, identity, or a meaningful multi-step operation.
**Mechanical enforcement:** partial; detect one-use bindings and missing blank lines, but allow editorial suppression.

### 3. Limit each example to one primary semantic contract

**Rule:** An example should teach one primary behavior plus only the adjacent concepts needed to observe it. Remove unused
domain errors, services, imports, and alternate programs.

**Motivation:** Generic type parameters do not need fictional scaffolding. Extra concepts make readers misidentify what is
essential.

**Good:**

```ts
await Effect.runPromise(Channel.runCollect(Channel.fromIterable([1, 2]))) // => [1, 2]
```

**Counterexample:** Declare an unused tagged error, registry, and service layer before demonstrating a pure constant.

**Exceptions/judgment:** A realistic integration example may carry more concepts when the integration itself is the
lesson. **Mechanical enforcement:** imports and unused declarations are lintable; conceptual load requires review.

### 4. Bound repetition, concurrency, and external cost

**Rule:** Runnable and production-oriented examples must explicitly bound retries, repeats, polling, generated streams,
agent/tool loops, and concurrent consumers unless non-termination is the documented behavior.

**Motivation:** Unbounded examples can hang doctests, leak resources, or teach unsafe production defaults.

**Good:**

```ts
const retryPolicy = Schedule.exponential("250 millis").pipe(
  Schedule.intersect(Schedule.recurs(4))
)
```

**Counterexample:**

```ts
while (true) {
  yield * session.generateText({ toolkit })
}
```

**Exceptions/judgment:** Runtime daemon examples may be intentionally unbounded when isolated as entrypoints and paired
with graceful shutdown. **Mechanical enforcement:** strong candidate for linting obvious `while (true)`, infinite
schedules, and polling streams without a bound or entrypoint annotation.

### 5. Observe the semantic boundary being documented

**Rule:** Assert the full semantic value when practical. Use a projection only when the full value is unstable or includes
irrelevant data, and choose a projection that distinguishes the promised behavior from neighboring outcomes.

**Motivation:** `_tag === "Failure"` cannot distinguish typed failure from defect; `isChannel` cannot demonstrate channel
consumption or completion.

**Good:**

```ts
await Effect.runPromiseExit(Effect.fail("missing")) // => Exit.fail("missing")
```

**Counterexample:**

```ts
;(await Effect.runPromiseExit(program))._tag // => "Failure"
```

**Exceptions/judgment:** Project machine-specific paths, timestamps, opaque handles, and intentionally large values onto
stable semantic fields. State why the projection is meaningful. **Mechanical enforcement:** no; weak projections can be
flagged heuristically but require API context.

### 6. Progress multiple examples by behavior

**Rule:** Multiple examples for one API or family should progress through: basic success, defining boundary/failure, then
composition or lifecycle behavior. Do not repeat equivalent happy paths in different syntax unless data-first/data-last
support is itself important.

**Motivation:** Behavioral progression spends documentation space on new information and exposes overload/runtime gaps.

**Good progression:** `Option.getOrElse` with `Some`, then `None`; a scoped resource with acquisition, use, then release on
failure; a stream with values, then early termination/leftovers.

**Counterexample:** Three examples that all map `[1, 2, 3]` successfully with renamed callbacks.

**Exceptions/judgment:** Show both calling styles when discoverability or dispatch correctness matters. **Mechanical
enforcement:** coverage metadata can identify repeated APIs and assertion shapes; value judgment remains manual.

### 7. Prefer direct observation over side-effect probes

**Rule:** Observe values through the documented abstraction's return value, collector, or fold. When lifecycle or
side-effect behavior has no direct result, install a deterministic local observer and assert the captured events or
lifecycle order. Console output alone is not an observation.

**Motivation:** Direct observation avoids incidental mutable state and keeps the assertion focused on the abstraction's
semantics. Execution-only examples prove only that code did not throw and encourage formatting snapshots.

**Good** (collecting Stream output directly):

```ts
await Effect.runPromise(Stream.runCollect(Stream.make(1, 2, 3))) // => [1, 2, 3]
```

**Counterexample** (reimplementing collection with external mutable state):

```ts
const values: Array<number> = []

await Effect.runPromise(
  Stream.make(1, 2, 3).pipe(
    Stream.runForEach((value) => Effect.sync(() => values.push(value)))
  )
)
values // => [1, 2, 3]
```

**Exceptions/judgment:** A local mutable probe is acceptable when the behavior has no returned value, as with observing an
`acquireRelease` finalizer:

```ts
const events: Array<string> = []
const resource = Effect.acquireRelease(
  Effect.sync(() => events.push("acquire")),
  () => Effect.sync(() => events.push("release"))
)

await Effect.runPromise(Effect.scoped(resource))
events // => ["acquire", "release"]
```

Keep such probes local and sequential. Prefer an Effect-managed `Ref`, `Deferred`, or `Queue` when concurrency is part of
the behavior. A concise entrypoint may intentionally demonstrate real console logging, but it should be plain, labeled
operational documentation rather than a semantic doctest. **Mechanical enforcement:** detect console-only marked examples,
discarded `Effect.result`, and `Stream.runForEach` examples whose only purpose is pushing every value into an external
array; observer quality still requires review.

### 8. Keep type examples type-only

**Rule:** Preserve runnable metadata so extraction and typechecking occur, but do not add runtime assertions that merely
repeat the assigned literal or compare a value with itself.

**Motivation:** Tautological assertions imply runtime coverage where only the type relationship matters.

**Good:**

```ts
const algorithm: Crypto.DigestAlgorithm = "SHA-256"
```

**Counterexample:**

```ts
const algorithm: Crypto.DigestAlgorithm = "SHA-256"
algorithm // => "SHA-256"
```

**Exceptions/judgment:** Assert runtime behavior when the type-level API also transforms or validates a value.
**Mechanical enforcement:** strong candidate; detect same-literal witnesses and self-comparisons in type-focused docs.

### 9. Keep repeated setup explicit until it becomes the lesson's noise

**Rule:** Do not hide setup in a helper merely to reduce line count. Extract shared setup only when several examples teach
the same domain and the helper has a clear public meaning; keep deployment wiring at milestone examples rather than every
incremental step.

**Motivation:** Local explicit setup aids copy/paste and comprehension, but large repeated servers and layers multiply drift.

**Good:** A short local schema repeated in two independent examples, or one named `UsersApiLive` fixture reused through a
guide about handlers.

**Counterexample:** A generic `setup()` helper whose body contains the only visible service/layer composition, or six
copies of a full server where only one endpoint option changes.

**Exceptions/judgment:** Standalone README quick starts should remain complete. **Mechanical enforcement:** duplicate/near-
duplicate detection can nominate blocks; extraction is an editorial decision.

## Coverage-improvement backlog

### P0: prevent readers from copying incorrect behavior

1. [x] Fix and regression-test the data-first `Stream.mapAccumArrayEffect` dispatch in
       [#6823](https://github.com/Effect-TS/effect/pull/6823).
2. [x] Correct the swapped DateTime examples and `Channel.merge` halt strategy.
3. [x] Resolve the `ChannelSchema.decodeUnknown` contract mismatch in
       [#6820](https://github.com/Effect-TS/effect/pull/6820).
4. [x] Fix the `Metric.linearBoundaries` defect in [#6821](https://github.com/Effect-TS/effect/pull/6821) and the
       `Metric.isMetric` defect in [#6822](https://github.com/Effect-TS/effect/pull/6822).

### P1: cover high-value source APIs

1. Add a data-first behavioral assertion whenever a custom `dual` predicate or overload dispatch is nontrivial.
2. Add examples for `Brand`, `ChannelSchema`, `HashRing`, `Sink.fromChannel`, and `Scope.use`, prioritizing validation,
   routing, leftovers/completion, and finalizer behavior over happy-path construction.

### P2: deepen behavior coverage

1. Continue replacing weak tag/guard projections after the completed Effect, Channel, schema, Queue, Deferred, Cause, Exit,
   and Metric pass; prioritize Sink and logging references next.
2. Review the execution-only source doctests from the audit baseline and classify each as type-only, test-registration,
   operational entrypoint, or missing observation. Recalculate before using the count; do not impose an assertion quota.
3. Add package-level progressions for one Node/Bun/browser platform adapter, one SQL client, one AI provider source module,
   and OpenTelemetry. Reuse the scenario across adjacent adapters only where semantics are genuinely equivalent.
4. Add failure, empty, cancellation, interruption, and cleanup examples where those behaviors define an API's value.

### P3: reduce maintenance cost

1. [x] Remove identified fictional error models and imports from example-heavy Channel and Metric docs.
2. Identify near-duplicate guide scaffolds and retain complete setup only at quick-start or milestone sections.
3. Normalize type-only examples and `Effect.runSync` doctests with narrow, reviewable codemods.

## Continuous-improvement process

### Review path for new examples

1. Author names the primary behavior and execution classification in the PR description.
2. Reviewer checks setup/operation/observation, explicit execution, determinism, bounds, cleanup, and semantic observation.
3. Source JSDoc changes run targeted doctest and package-local docgen.
4. Reviewer compares nearby family examples to ensure the new example adds a behavior rather than another equivalent happy
   path.
5. CI reports coverage deltas as information. A decrease or increase is not automatically a failure without behavioral
   context.

### Mechanical opportunities

- Extend Oxlint/doctest diagnostics for unsupported/standalone `// =>`, multiple evaluation, unawaited promises,
  unexecuted Effects, and unconsumed iterators.
- Add checks for marked examples using `Effect.runSync`, live clocks/randomness, console-only observations, evaluated
  `declare` values, and obvious unbounded loops.
- Add a report-only codemod for one-use result bindings, dense arrays, and direct assertions. Require human approval because
  bindings can carry narrative meaning.
- Add near-duplicate detection for large guide fences and API-family scenario drift; never auto-deduplicate.

### Metrics worth tracking

- Public modules with an introductory example.
- Exported APIs with any example, split by stable/unstable and package, using the syntactic metric only as a triage signal.
- Behaviors covered per API: success, empty/boundary, typed failure, defect, async/concurrency, interruption, and
  acquisition/release.
- Runnable, typechecked-only, entrypoint, and external-prerequisite examples.
- Runnable examples with semantic observations versus intentional execution-only/type-only examples.
- Example defect escape rate: stale APIs found outside CI, flaky examples, and examples that pass while teaching the wrong
  API.
- Median conceptual dependencies per example (imports, local helpers, services) as a review signal, not a target.

### Guardrails against low-value quantity

- Do not set a repository-wide “examples per export” quota.
- Require every added example to name a behavior not already demonstrated nearby.
- Weight lifecycle, failure, boundary, and composition coverage above repeated success calls.
- Allow no-example decisions for aliases, obvious constants, internal protocols, and APIs adequately covered by a family
  introduction.
- Review metric changes alongside a short qualitative sample; never reward added fences without execution classification
  and behavior labels.

## Maintainer questions

1. Should platform and SQL packages own package-level examples, or should canonical examples live only in shared Effect
   source docs to avoid adapter duplication?
2. Is the preferred behavior for side-effect examples a repository-provided capture helper, or explicit local observers in
   each example?
3. Should coverage reporting exclude generated provider declarations and low-level type/protocol exports by an explicit
   annotation, or remain a deliberately broad triage denominator?

## Validation record

Audit review batches provided the following execution evidence:

- Effect A-M source review: 1,662 scoped doctests across 58 modules passed; package-local Effect docgen passed.
- Effect N-Z source review: `pnpm doctest --run packages/effect/src/[N-Z]*.ts` passed 1,348 doctests across 61 modules;
  package-local Effect docgen passed.
- Satellite-package source review: targeted doctest execution passed 24 examples across 11 source files.

Follow-up implementation validation:

- `pnpm doctest --run packages/effect/src`: passed 3,356 doctests across 164 source files.
- Targeted doctest runs for OpenTelemetry, platform Deno, and final changed Effect modules passed.
- Package-local `pnpm docgen` passed for Effect (3,320 examples), Vitest, OpenTelemetry, and platform Deno.
- Separate functional PR validation covered the focused Metric, Stream, and ChannelSchema regression tests and the
  ChannelSchema type-level test.
- `pnpm lint-fix`, `pnpm lint`, `pnpm check`, and `git diff --check` passed.

Final report validation:

- `pnpm exec dprint check audits/documentation/example-audit.md`: passed.
- `pnpm exec oxlint -f unix audits/documentation/example-audit.md`: not applicable; Oxlint reported that Markdown is not a
  supported lint target. The repository-wide Oxlint phase below passed.
- `pnpm lint-fix`: passed and formatted this report.
- `pnpm lint`: passed (`oxlint -f unix` and `dprint check`).
- `pnpm check`: passed.
- `git diff --check`: passed.

## Follow-up edits

The documentation follow-up changed canonical guidelines and source examples. Runtime implementations, focused tests, and
changesets required by verified example/API mismatches were split into PRs #6820-#6823. Generated documentation was updated
only through package-local docgen. The broad cleanup was split by API family and retained mutable probes where callbacks,
finalizers, or lifecycle order were the documented contract.
