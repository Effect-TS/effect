# Arbitrary in Effect

The `effect/unstable/arbitrary/Arbitrary` module derives generated values from Effect Schema and runs property checks
without exposing a third-party property-testing engine.

The module is currently unstable. Its import path, result types, generation policies, and replay format may change as
the implementation is exercised by more applications.

If you are upgrading from the earlier Schema arbitrary integration available in `effect@4.0.0-rc.109`, see the
[migration guide](ARBITRARY-MIGRATION.md).

## Getting Started

Use `Arbitrary.schema` to derive an `Arbitrary` from the decoded `Type` of a Schema, then use `Arbitrary.sampleEffect` to
generate values:

```ts
import { Effect, Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const Person = Schema.Struct({
  name: Schema.String.check(Schema.isMinLength(1)),
  age: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 120 }))
})

const people = Arbitrary.schema(Person)

const program = Arbitrary.sampleEffect(people, {
  count: 20,
  seed: "people"
})

await Effect.runPromise(program)
// ReadonlyArray<{ readonly name: string; readonly age: number }>
```

The same seed, Schema, and options produce the same sequence of samples within the same implementation.

`Arbitrary` is intentionally opaque. Schema remains the public language for primitive and structural generation;
there is no second catalog of constructors such as `String` or `Array`. Existing Arbitraries can be composed with
`map`, `flatMap`, `filter`, `filterMap`, and `all`.

## Composing Arbitraries

Use `map` for total transformations, `filter` for predicates or refinements, and `filterMap` when transformation can
reject a value:

```ts
import { Result, Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const integers = Arbitrary.schema(Schema.Int)

const nonNegativeLabels = integers.pipe(
  Arbitrary.filter((value) => value >= 0),
  Arbitrary.map((value) => `integer:${value}`)
)

const positiveLabels = Arbitrary.filterMap(
  integers,
  (value) => value > 0 ? Result.succeed(`positive:${value}`) : Result.fail(value)
)
```

`map` transforms the complete shrink tree. `filter` and `filterMap` discard rejected roots, while rejected shrink
nodes are skipped and their valid descendants remain reachable. Root rejection is bounded by `maxDiscards`, so an
impossible predicate produces `SampleError` or `Exhausted` instead of searching forever.

Prefer Schema checks when they describe the domain directly. The Schema compiler may turn recognized checks into
constructive generation, while an arbitrary-level filter must first generate a candidate and then test it.

Use `all` to generate independent Arbitraries together. It accepts tuples, other iterables, and records while preserving
their shape:

```ts
const point = Arbitrary.all([
  Arbitrary.schema(Schema.Number),
  Arbitrary.schema(Schema.Number)
])

const person = Arbitrary.all({
  name: Arbitrary.schema(Schema.String),
  age: Arbitrary.schema(Schema.Int)
})
```

Members share one recursion budget and are generated in a randomized internal order, then restored to their original
tuple position or record key. Shrinking changes one member at a time. Empty tuples and records generate their matching
empty value.

Record results from `all`, and object values derived through `Schema.Struct`, `Schema.Record`, and `Schema.Json`,
periodically use a null prototype to expose code that accidentally depends on inherited object members. Prefer
`Object.hasOwn(value, key)` to calling inherited methods on generated values. The chosen prototype is preserved while
shrinking and replaying a value.

Use `flatMap` when the domain or shape of one value depends on another generated value. Precompile finite dependent
Arbitraries when possible, because deriving a Schema inside the callback repeats that derivation whenever the callback
is evaluated:

```ts
import { Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const Length = Arbitrary.schema(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 4 }))
)

const StringsByLength = globalThis.Array.from({ length: 4 }, (_, index) => {
  const length = index + 1
  return Arbitrary.schema(
    Schema.String.check(Schema.isMinLength(length), Schema.isMaxLength(length))
  )
})

const SizedString = Length.pipe(
  Arbitrary.flatMap((length) => StringsByLength[length - 1])
)
```

`flatMap` shrinks source values first and regenerates their selected dependent Arbitrary. It then shrinks the current
dependent value. Once a dependent shrink is selected, source shrinking stays closed on that branch. Root rejection by
either Arbitrary counts as a discard; a dependent rejected while shrinking is skipped and valid descendants of the
source remain reachable.

Combinator callbacks must be synchronous, deterministic, terminating, and must not mutate generated values. They may
be evaluated again during shrinking and replay. A thrown exception remains a defect of the `Effect` returned by
`sampleEffect` or `checkEffect`.

## Checking Properties

`Arbitrary.checkEffect` evaluates a pure or Effectful property and shrinks the first failure it finds:

```ts
import { Effect, Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const values = Arbitrary.schema(Schema.Array(Schema.Int))

const program = Arbitrary.checkEffect(
  values,
  (input) => input.slice().reverse().reverse().every((value, index) => value === input[index]),
  { runs: 100, seed: "reverse" }
)

await Effect.runPromise(program)
// { _tag: "Passed", runs: 100, discards: 0 }
```

An Effectful property may use services and may fail with a typed error:

```ts
import { Effect, Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const program = Arbitrary.checkEffect(
  Arbitrary.schema(Schema.String),
  (value) => Effect.succeed(value.length >= 0)
)
```

A property failure is data rather than a thrown assertion. Inspect the `_tag` of the returned `CheckResult`:

| Result           | Meaning                                                                            |
| ---------------- | ---------------------------------------------------------------------------------- |
| `Passed`         | Every requested run passed.                                                        |
| `Falsified`      | A property returned `false` or its Effect failed. Includes the shrunk input found. |
| `Exhausted`      | Generation exceeded `maxDiscards`; includes the effective seed for reproduction.   |
| `ReplayMismatch` | The recorded attempt or accepted shrink path no longer reproduces a failure.       |

When an Effectful property fails, `Falsified.failure` is a `PropertyError` containing the typed error. Returning
`false` produces `ReturnedFalse`.

Defects and fiber interruption are not converted into `CheckResult` values. They continue through the Effect returned
by `checkEffect`. This means a property check can be interrupted normally by an Effect timeout, a test timeout, or its
parent fiber.

Properties must be deterministic for the same input and environment. They must also treat generated values as
immutable. The runner may evaluate a value more than once while shrinking or replaying, and it does not clone values or
restore mutated services between evaluations.

## Replaying a Failure

Every `Falsified` result contains an opaque `replay` token. The token identifies both the original generated value and
the complete shrink path that led to the reported input:

```ts
import { Effect, Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const arbitrary = Arbitrary.schema(Schema.Int)

const program = Effect.gen(function*() {
  const first = yield* Arbitrary.checkEffect(arbitrary, (value) => value < 10, {
    seed: "integer-bound"
  })

  if (first._tag === "Falsified") {
    const replayed = yield* Arbitrary.checkEffect(
      arbitrary,
      (value) => value < 10,
      { replay: first.replay }
    )
    return replayed
  }

  return first
})
```

Store the token in logs or failure output when you need to reproduce a failure locally. Replay compatibility is not
guaranteed across releases of this unstable module. For a permanent regression test, add the materialized
shrunk input as an ordinary example-based test.

When `replay` is present, the token supplies the seed, attempt, effective size, and shrink path. The `runs`, `size`,
`maxDiscards`, `maxShrinks`, and `seed` options are ignored; specifying them alongside `replay` does not alter the run.

A `ReplayMismatch` is returned when the Schema, property, or implementation has changed enough that the recorded
attempt or accepted shrink path no longer reproduces a failure. The token does not fingerprint the shrunk input or
failure value, so a different failure at the same recorded coordinates is still a successful replay.

## Sampling Options

`Arbitrary.sampleEffect` accepts the following options:

| Option        | Default                      | Meaning                                                      |
| ------------- | ---------------------------- | ------------------------------------------------------------ |
| `count`       | `10`                         | Number of values to return.                                  |
| `size`        | `10`                         | Local complexity scale and shared recursion allowance.       |
| `maxDiscards` | `max(100, count * 10)`       | Maximum rejected attempts before failing with `SampleError`. |
| `seed`        | A value from Effect `Random` | String or number used to reproduce the generated sequence.   |

If generation exhausts its discard budget, the Effect fails with a `SampleError` containing the number of values that
were generated, the number of discarded attempts, and the effective seed. Passing that seed to another `sampleEffect`
call reproduces the run even when the original call did not specify one.

## Check Options

`Arbitrary.checkEffect` accepts the following options:

| Option        | Default                      | Meaning                                                                |
| ------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `runs`        | `100`                        | Number of successful generations and property evaluations to complete. |
| `size`        | `10`                         | Maximum local complexity scale. It grows with completed runs.          |
| `maxDiscards` | `max(100, runs * 10)`        | Maximum rejected attempts before returning `Exhausted`.                |
| `maxShrinks`  | `100`                        | Maximum shrink candidates inspected after the initial failure.         |
| `seed`        | A value from Effect `Random` | String or number used to reproduce generation.                         |
| `replay`      | None                         | Opaque token from a previous `Falsified` result.                       |

Discarded attempts do not count as completed runs and do not advance the progressive size. When `runs` is `1`, the
configured `size` is used directly.

`size` is a local generation scale, not a global bound on the complete value. Each sibling string, collection, or
object property observes the same current size independently. Recursive branches instead consume one shared allowance
across the complete sample. Required Schema members and explicit minima are still honored, while explicit maxima clamp
generation.

## How Schema Derivation Works

`Arbitrary.schema` generates the decoded `Type` of the input Schema. For example, deriving from
`Schema.NumberFromString` generates numbers, not encoded strings.

Derivation is eager. If the current implementation cannot derive a generator, `Arbitrary.schema` throws immediately
instead of returning an `Arbitrary` that fails later.

### Constraints and Filters

The compiler understands common Schema checks constructively, including:

- numeric and ordered bounds;
- finite and integer numbers;
- string, collection, and property-count bounds;
- supported regular-expression patterns;
- uniqueness constraints.

Constructive generation narrows the source domain before producing a value. Other custom checks remain authoritative
and are applied as residual filters. A candidate rejected by a residual filter is a discard.

Discarding is always bounded by `maxDiscards`. An impossible or extremely selective custom filter therefore produces
`SampleError` or `Exhausted` instead of leaving the runner searching indefinitely for a value.

### Recursive Schemas

Recursive and mutually recursive Schemas are supported when the derived root has a finite generation path:

```ts
import { Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

interface Node {
  readonly value: string
  readonly children: ReadonlyArray<Node>
}

const Node: Schema.Codec<Node> = Schema.Struct({
  value: Schema.String,
  children: Schema.Array(Schema.suspend(() => Node)).check(Schema.isMaxLength(3))
})

const nodes = Arbitrary.schema(Node)
```

The empty `children` array is a finite path, so the Schema is productive. The compiler analyzes mutually recursive
components together and shares one recursion allowance across the complete sample. This prevents recursive siblings
from each extending to the full optional depth independently.

An unproductive recursive branch is excluded as an empty alternative. If the root has no finite route, derivation
throws immediately. The caller does not need to provide a terminal arbitrary, a depth identifier, or another
recursion-specific annotation.

### Declaration Schemas

For a `Schema.declare` or another opaque declaration, the compiler resolves a generation representation in this order:

1. an explicit `toCodecArbitrary`;
2. a compiler-owned representation for an Effect built-in;
3. `toCodecJson`;
4. `toCodec`.

Most declarations with a useful canonical codec need no arbitrary-specific annotation. Add `toCodecArbitrary` only
when the canonical representation is opaque or is statistically unsuitable for generation.

If a `toCodecJson` annotation is present but returns `undefined`, the declaration is explicitly JSON-canonical and
opaque. Derivation fails rather than falling through to `toCodec`.

`toCodecArbitrary` returns a Schema `Link`, not an `Arbitrary`. The source Schema describes a representation that can
be generated constructively, and the transformation decodes that representation into the declaration type:

```ts
import { Schema, SchemaTransformation } from "effect"

class UserId {
  readonly value: number
  constructor(value: number) {
    this.value = value
  }
}

const UserIdSchema = Schema.instanceOf(UserId, {
  toCodecArbitrary: () =>
    Schema.link<UserId>()(
      Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1_000_000 })),
      SchemaTransformation.transform({
        decode: (value) => new UserId(value),
        encode: (id) => id.value
      })
    )
})
```

The compiler validates decoded candidates against the original declaration. A partial Link is allowed: unsuccessful
decodes or values rejected by the declaration become bounded discards, and valid descendants remain available while
shrinking. Typed decode failures become bounded discards, while defects and interruption remain failures of the
sampling or checking Effect.

The callback also receives:

- decoded `typeParameters` for parametric declarations;
- normalized recognized `constraint` values for the declaration.

ReadonlyMap and ReadonlySet are common built-ins and use compiler-owned array representations with constructive length
and uniqueness checks. Effect-specific HashMap, HashSet, and Chunk keep declaration-local `toCodecArbitrary` Links, as
do Graph, BigDecimal, and date-time declarations whose efficient representations depend on their domain modules. Maps
use `Schema.isUniqueKey()` to project entries to keys; sets use `Schema.isUnique()`. Declarations whose canonical codec
is already productive require no arbitrary-specific annotation.

## Using `@effect/vitest`

`@effect/vitest` accepts tuple or struct collections containing Schemas, Arbitraries, or both:

```ts
import { assert, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const Name = Arbitrary.schema(Schema.Literals(["Ada", "Grace"]))

it.prop(
  "integer addition is commutative",
  [Schema.Int, Schema.Int],
  ([a, b]) => a + b === b + a,
  { arbitrary: { runs: 200, seed: "addition" } }
)

it.effect.prop(
  "generated values can be checked in an Effect",
  { name: Name, value: Schema.Int },
  ({ name, value }) =>
    Effect.sync(() => {
      assert.include(["Ada", "Grace"], name)
      assert.isTrue(Number.isInteger(value))
    }),
  { arbitrary: { runs: 50 } }
)
```

Third-party arbitrary values and runner-specific option objects are not supported. Use native Arbitraries when a
property input needs composition beyond a Schema.

`@effect/vitest` turns `Falsified`, `Exhausted`, and `ReplayMismatch` results into test failures. Falsified output
includes the shrunk input and replay token.

The adapter treats a property as falsified when it returns `false`, throws, or completes with any non-interruption
Effect failure. Typed failures, assertion defects, and other defects are therefore shrunk and reported with the final
input. Effect interruption remains an interruption and is not converted into a falsification. A property that
returns normally with any value other than `false`, including `void`, passes for that generated input.

The Vitest `timeout` interrupts the Effect fiber running property generation, evaluation, and shrinking. Effect
finalizers run during the interruption, which remains a test timeout rather than becoming a property falsification.
Because interruption is cooperative, a timeout cannot preempt a synchronous JavaScript callback that does not return.

## Advantages of the Native Implementation

The native implementation gives Effect ownership of the public model, generation semantics, and runner.

- **No third-party engine coupling.** The `effect` package owns its `Arbitrary`, constraints, recursion model, replay
  paths, and runner options. Applications do not inherit another engine's versions or public types through Schema.
- **One language for data domains.** Schema describes structure, checks, canonical codecs, declarations, and recursion.
  The Arbitrary module does not mirror that catalog with a builder interface, HKT encoding, or second public AST.
- **Schema-aware recursion.** Recursive and mutually recursive components are analyzed automatically. Derivation fails
  immediately when the root has no finite path, and recursive branches share one per-sample fuel budget. Callers do not
  wire a terminal generator or depth identifier manually.
- **Bounded rejection.** Root rejection is represented as a discard and is limited by `maxDiscards`. An impossible
  filter returns `SampleError` or `Exhausted` instead of remaining inside an unbounded generator retry loop. During
  shrinking, `maxShrinks` also bounds rejected-node promotion, not only property evaluations.
- **Effect-native execution.** Sampling and checking are interruptible Effects. Properties may be pure or Effectful,
  typed failures remain data, defects remain defects, and services compose normally. The same runner powers direct
  checks, `TestSchema`, and `@effect/vitest`.
- **Native product composition.** `all` combines standalone Arbitraries directly, so integrations such as
  `@effect/vitest` do not need synthetic Schemas or private annotations to generate tuples and records.
- **Replay as one value.** A falsification carries one opaque token for the original attempt and complete accepted
  shrink path. Native replay regenerates and re-evaluates the original failing attempt before traversing that full path,
  and reports a mismatch when the recorded coordinates no longer reproduce a failure.
- **Dependent shrinking designed for the native engine.** `flatMap` checkpoints randomness after its source. Shrinking
  the source therefore changes the dependent constraint while retaining the same subsequent random choices. A shared
  residual recursion budget prevents nested `flatMap` calls from each receiving a fresh optional allowance.
- **Focused bundle and runtime paths.** Common Schema shapes compile to direct generation loops, and sampling without
  shrinking stays on a synchronous lane. Bundle and runtime fixtures track these paths as implementation budgets rather
  than universal performance guarantees.

Some of these gains come from tighter integration and some from narrower scope. The native engine deliberately focuses
on Schema-derived domains and Effect execution rather than reproducing every constructor, distribution, reporter,
example facility, or runner option of a general-purpose property-testing engine.

## Current Scope

The unstable module intentionally keeps its constructor surface small. It does not currently expose:

- a public arbitrary constructor catalog;
- assertion formatting outside the `@effect/vitest` integration;
- parallel property evaluation;
- a replay compatibility guarantee across releases.

These boundaries keep generation semantics owned by Schema while leaving the internal generator and shrink
representation replaceable.

## Appendix: Technical Decisions

This appendix records the implementation choices that define the first native engine. They are documented because the
module is unstable and because changing one can alter generated sequences, shrinking, replay, performance, or bundle
size even when the public types remain unchanged.

### Public Boundary

- `Arbitrary<A>` is opaque, covariant, nominally identified, and `Pipeable`. Its `gen` field is internal.
- Schema is the only public catalog for primitive and structural generation. The module exposes composition and
  running operations, not a public `Sample`, shrink tree, PRNG, recursion budget, compiler context, or builder.
- `sampleEffect` and `checkEffect` are named for their Effect return type, leaving room for future synchronous runners
  without overloading their semantics.
- Mapper, predicate, and `flatMap` callbacks must be synchronous, deterministic, terminating, and non-mutating. Their
  thrown exceptions are defects of the Effect runner. Properties may return an Effect, but must remain deterministic
  and non-mutating for the same input and initial environment. A synchronous callback that never returns cannot be
  preempted.

### Generation Kernel

- The private `Generator<A>` contains only `minCost` and `generate`. Schema-only `Compiled<A>` nodes extend it with
  mutable dependency and fixed-point metadata; ordinary Arbitrary combinators do not participate in the Schema graph.
- One generation call returns either `Generated` or `Discarded`, synchronously when possible and as an Effect only when
  necessary. Internal combinators use the eager Effect operators so immediate results stay on the synchronous path.
- A generated value optionally owns a lazy, one-shot `Pull` of smaller `Generated` or `Discarded` attempts. Rejected
  nodes remain observable exactly once by the runner so `maxShrinks` can bound total traversal while their descendants
  are still promoted. The tree is not materialized eagerly, and sampling with shrinking disabled does not construct
  shrink carriers.

### Schema Compilation

- Compilation begins with `SchemaAST.toType`, so generation targets the decoded Schema `Type`, never its encoded side.
- The compiler works directly from Schema AST rather than translating it into a second Arbitrary AST. This retains
  check ordering, declaration Links, decoded type parameters, Suspend identity, and paths in one representation.
- Compilation is eager and cached by AST plus inherited constraint within one derivation. Placeholders are finalized
  after the graph is discovered. Unsupported declarations, directly contradictory normalized bounds, and recursive
  roots without a finite path fail during `Arbitrary.schema`; other incompatible check combinations exhaust at
  runtime.
- Recognized checks are normalized and pushed into primitive or structural generators. The original checks remain
  authoritative residual predicates. Ordinary nodes do not run a general Schema parser for every sample; declaration
  Links are decoded and then validated against their original declaration.
- Supported regular-expression patterns become constructive candidates, while every pattern remains a residual
  predicate. One supported candidate is selected uniformly for each attempt; failure to generate within the active
  length constraints discards that attempt. Unsupported patterns remain filters rather than making the whole Schema
  unsupported.
- Compiled patterns cache feasible UTF-16 lengths up to the largest requested bound. Sequence generation computes
  suffix feasibility once, and character classes precompute their preferred code points and cardinalities. The same
  metadata is reused by structural shrinking without changing the generated language.

### Declarations

- Declaration representations resolve in the order explicit `toCodecArbitrary`, compiler-owned Effect built-in,
  `toCodecJson`, then `toCodec`.
  `toCodecJson() === undefined` means that the declaration is JSON-canonical but still opaque, so resolution stops and
  derivation fails instead of silently choosing another codec.
- `toCodecArbitrary` returns a Schema `Link`. Its source is generated constructively, its decode may reject, and the
  original declaration remains authoritative. Invalid roots are bounded discards; invalid shrink nodes are omitted and
  valid descendants are promoted.
- The callback receives decoded type parameters and normalized constraints. ReadonlyMap and ReadonlySet use
  compiler-owned array representations. HashMap, HashSet, and Chunk keep explicit declaration Links whose source arrays
  carry length and uniqueness checks. Domain-specific built-ins may likewise keep local Links so their implementations
  are not retained by every user of the generic compiler.
- The compiler may use `Order` while merging bounds, but removes it before passing the flattened constraint to a
  `toCodecArbitrary` callback. Link authors own the semantic compatibility of their representation; the original
  declaration checks turn incompatible outputs into bounded discards.
- Decode-only generation Links use `SchemaGetter.forbiddenEncoding`; generation never invokes their encode side.

### Recursion and Size

- Suspend dependencies are analyzed as a graph. A fixed point computes the minimum recursive cost and identifies
  productive branches; an unproductive branch behaves as empty, while an unproductive root is rejected eagerly.
- Each generation attempt starts with `minCost + size` units of recursive fuel. Recursive Suspend crossings consume
  fuel, and child minima are reserved before siblings generate. Recursive siblings are shuffled for fair access to the
  shared fuel, then written back in declaration order.
- The budget is shared across recursive and mutually recursive branches in the complete sample. A sibling or nested
  composition does not receive its own fresh optional recursion allowance.
- `size` is also visible to each collection or string generator as a complexity/cardinality target. It is fixed for
  direct sampling and grows with successful property runs. Explicit Schema minima remain mandatory and maxima clamp
  generation; discarded attempts do not advance size.

### Randomness and Distributions

- The runner resolves one master seed, hashes its type and value, and derives an independent xoshiro128** state from
  `(seed, attempt)`. Replay can therefore jump directly to an attempt without executing earlier attempts, and property
  use of Effect `Random` cannot perturb generation.
- Null-prototype objects are enabled as a deterministic edge mode for periodic generation attempts. Selecting this mode
  does not consume the generation PRNG, so adding prototype coverage does not perturb the attempt's structural choices.
  Every structural object in that attempt uses the same mode, and its shrink descendants retain it.
- Integer and BigInt ranges use exact rejection sampling. Numeric generation includes a run-dependent boundary bias;
  IEEE-754 numbers use a monotone bit index so signed zero, subnormal values, infinities, and NaN can participate in
  generation and shrinking when allowed. Supported `Order.Number` bounds retain NaN exactly when it satisfies the
  merged bounds, while finite and integer constraints exclude it.
- Unbounded Int and BigInt magnitude grows with size. Ordinary strings use printable ASCII plus an explicit JavaScript
  edge corpus; regex generation supports a defined subset and counts UTF-16 code units.
- Exact probabilities, seeds-to-values, and shrink orders are implementation details. Low-level techniques derived from
  prior property-testing and PRNG implementations are attributed next to their source code; the module's value does not
  depend on presenting those techniques as Effect inventions.

### Structural Generation and Shrinking

- Arrays remove optional or repeated structure before shrinking elements. Objects select optional properties without
  favoring their declaration position. If recursive costs make the selected subset unaffordable, generation uses the
  minimum-cost subset satisfying the property minimum rather than discarding an otherwise inhabitable object. Objects
  remove optional/index entries, shrink values, then shrink generated keys while preserving key uniqueness. Struct,
  Record, JSON-object, and record-shaped `all` outputs participate in periodic null-prototype generation; arrays,
  tuples, declarations, and collection values do not.
- Uniqueness is constructive and has bounded retries. `Schema.isUnique()` selects complete elements, while
  `Schema.isUniqueKey()` projects Map entries to their keys. Both follow Effect equality; the generator uses equivalent
  specialized tracking for primitive values and Effect `Hash` and `Equal` for objects.
- Schema unions select uniformly among members affordable under the current recursive budget. During shrinking they first
  offer the earliest globally minimum-cost member when it is strictly cheaper than the selected member, then the
  selected member's own shrink tree. Lazy fallback generation uses an isolated PRNG state, so unrelated later product
  members cannot change that shrink tree. `oneOf` candidates are validated against exclusive membership; overlaps are
  bounded discards and invalid shrink nodes promote valid descendants. Static arbitrary-level choice and weighted choice
  are not part of the current interface.
- `all` sums the minimum costs of its members and shares one recursion budget across them. Generation order is shuffled
  for fairness, but tuple positions and record keys are restored before exposing the value. Shrinking changes one
  member at a time and preserves the others.
- `map` transforms the complete tree without consuming randomness or changing its positions, including duplicate
  mapped values. `filter` and `filterMap` turn a rejected root into `Discarded`; while shrinking they omit rejected nodes
  and promote valid descendants. Hidden promotion work is lazy and interruptible. Each rejected node consumes one
  unit of `maxShrinks`, but it does not evaluate the property.
- `filterMap` discards the failure value carried by `Result`. `map` and `filter` retain specialized implementations so
  their common paths do not allocate or inspect a `Result` merely to reuse `filterMap` as a semantic primitive.

### Dependent Generation with `flatMap`

- Generation runs the source, evaluates the callback, then runs the selected dependent Arbitrary. The composed
  generator's static minimum cost is the source minimum because the dynamic dependent minimum is funded locally.
- Shrinking is source-first. A selected source shrink retains its further source shrinks. The current dependent tree is
  tried afterward, and selecting one of its nodes permanently closes source shrinking for that branch. The one-shot
  `Pull` remains sufficient; a replayable tree or ZIO-style source reopening is unnecessary under deterministic
  callbacks.
- An initial source or dependent discard rejects the complete attempt. When a dependent for a source shrink discards,
  that node is hidden, consumes one unit of `maxShrinks`, and promotes the source node's descendants without an
  internal retry.
- Sampling, where shrinking is disabled, uses the enclosing state directly and creates no checkpoint. For checking,
  the source receives an isolated PRNG and budget state. The engine checkpoints after source generation, and the
  initial dependent plus every source-shrink dependent receives an independent clone of that checkpoint. Only the
  initial branch commits its final state; lazy shrink branches cannot perturb siblings or later generation.
- If `r` is the residual source fuel and `m` is the selected dependent minimum, the dependent starts with `r + m` and
  commits `min(r, dependentRemaining)`. The top-up guarantees productivity at size zero, while the clamp prevents its
  unused portion from becoming fresh optional recursion fuel. Nested `flatMap` calls therefore share one allowance.
- Calling `Arbitrary.schema` inside the callback recompiles that Schema for every callback evaluation. The engine does
  not introduce implicit memoization or a registry.

### Runner, Replay, and Interruption

- `sampleEffect` fails with typed `SampleError`. `checkEffect` returns `Passed`, `Falsified`, `Exhausted`, or
  `ReplayMismatch`. `SampleError` and `Exhausted` retain the effective seed so exhaustion can be reproduced. Only exact
  `true` passes; `false` and typed Effect failure are shrinkable property failures. Defects and interruption stay in the
  Effect channel.
- Shrinking follows the first failing child. `maxShrinks` limits all inspected shrink candidates, including candidates
  rejected before reaching the property, while `shrinks` counts accepted failing descents. Runs exclude shrink
  evaluations. When the budget is exhausted, the runner returns the best shrunk input found so far. Generated values
  are neither cloned nor frozen.
- A replay token is opaque and records the seed, attempt, effective size, and complete accepted sibling path. Replay
  reconstructs contexts instead of serializing the shrink tree and returns `ReplayMismatch` when the attempt or path
  no longer reproduces a failure. It does not compare shrunk-input or failure fingerprints. Malformed tokens may
  defect, and compatibility is not promised across unstable releases. Replay follows the recorded path without
  repeating the shrink search, so it ignores `maxShrinks`.
- Long synchronous attempt loops yield according to `Scheduler.MaxOpsBeforeYield`. Effectful generation, declaration
  decoding, property evaluation, and lazy shrink traversal remain interruptible. Parallel property evaluation is not
  part of the current runner.

### Deliberate Boundaries

- Seeds-to-values, distributions, and locally shrunk inputs are implementation details. For compiler-derived and
  Link-derived generation, the guarantees are domain validity, bounded generation, deterministic replay within an
  implementation, productive recursion, and the documented shrink policies.
- The module does not expose the private `Sample` carrier, custom shrink trees, parallel checking, a general-purpose
  runner configuration surface, formatted assertion reporting outside `@effect/vitest`, or cross-release replay
  stability.
- The engine is optimized for Effect Schema and Effect execution rather than serving as a universal property-testing
  toolkit.
