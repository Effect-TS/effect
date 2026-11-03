/**
 * Derives, samples, and checks generated values from Effect Schema.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Cause from "./Cause.ts"
import type * as Effect from "./Effect.ts"
import type * as Exit from "./Exit.ts"
import type * as Filter from "./Filter.ts"
import * as Formatter from "./Formatter.ts"
import { dual } from "./Function.ts"
import * as InternalCommands from "./internal/arbitrary/commands.ts"
import type * as Model from "./internal/arbitrary/model.ts"
import * as Internal from "./internal/arbitrary/runner.ts"
import type { Pipeable } from "./Pipeable.ts"
import { hasProperty, type Predicate, type Refinement } from "./Predicate.ts"
import type * as Schema_ from "./Schema.ts"
import type * as Types from "./Types.ts"

/**
 * Runtime type identifier for `Arbitrary` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = Internal.TypeId

/**
 * Type of the runtime identifier for `Arbitrary` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~effect/arbitrary/Arbitrary"

/**
 * Represents a pure description of values that can be generated and shrunk.
 *
 * **When to use**
 *
 * Use as the result of {@link schema}, {@link Constant}, and composition, and as the input to {@link sampleEffect} or
 * {@link checkEffect}.
 *
 * **Details**
 *
 * Arbitraries implement `Pipeable`, so data-last combinators can be composed with `.pipe(...)`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Arbitrary<out A> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly "~A": Types.Covariant<A>
  /**
   * @internal
   */
  readonly gen: Model.Generator<A>
}

/**
 * Configures Schema-derived generation.
 *
 * **Details**
 *
 * `shrink` returns the immediate semantic simplifications of a failing value. Each returned candidate is validated
 * against the decoded side of the original Schema before it can reach the property.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface SchemaOptions<A> {
  readonly shrink?: ((value: A) => ReadonlyArray<A>) | undefined
}

/**
 * Configures the lengths generated and preserved during shrinking by {@link array}.
 *
 * **Details**
 *
 * `minLength` defaults to zero. Generation grows with `size`, honors `minLength` even at size zero, and is capped by
 * `maxLength` when provided. Both bounds must be integers between zero and 4294967295, with `minLength <= maxLength`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ArrayOptions {
  readonly minLength?: number | undefined
  readonly maxLength?: number | undefined
}

/**
 * Checks whether a value is an `Arbitrary`.
 *
 * **When to use**
 *
 * Use when accepting both Arbitrary values and other input descriptions.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isArbitrary = (u: unknown): u is Arbitrary<unknown> => hasProperty(u, TypeId)

/**
 * Configures direct sampling from an `Arbitrary`.
 *
 * **Details**
 *
 * `size` is a local complexity scale, not a global bound on the complete value. Each unconstrained string, collection,
 * or object property observes the same size independently, while recursive branches share one recursion allowance.
 * Explicit Schema minima and required members are still honored, while explicit maxima clamp generation.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface SampleOptions {
  readonly count?: number | undefined
  readonly size?: number | undefined
  readonly maxDiscards?: number | undefined
  readonly seed?: string | number | undefined
}

/**
 * Describes sampling exhaustion before the requested number of values was generated.
 *
 * **Details**
 *
 * The effective `seed` can be passed to {@link sampleEffect} to reproduce the exhausted run, including when sampling
 * originally selected a seed from the Effect `Random` service.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export interface SampleError {
  readonly _tag: "SampleError"
  readonly generated: number
  readonly discards: number
  readonly seed: string | number
}

/**
 * Opaque string token that replays a falsification and its complete shrink path.
 *
 * **When to use**
 *
 * Use with {@link CheckOptions.replay} to copy, store, and reproduce a `Falsified` result from the same
 * implementation.
 *
 * **Details**
 *
 * The token records whether the property returned `false` or failed its Effect, but does not record a typed error value
 * or input fingerprint.
 *
 * **Gotchas**
 *
 * Replay compatibility is not guaranteed across releases of this unstable module.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Replay = string

/**
 * Configures property checking, shrinking, and replay.
 *
 * **Details**
 *
 * `size` is the maximum local complexity scale. Checking starts with smaller values and grows to that size according
 * to completed runs; discarded attempts do not advance the progression. A single-run check uses the configured size.
 * Each unconstrained string, collection, or object property observes the current size independently. Recursive
 * branches instead consume one shared recursion allowance. Explicit Schema bounds and required members still apply.
 *
 * `concurrency` is a positive safe integer, defaulting to `1`. It bounds the number of pending generated cases,
 * including evaluations that have completed ahead of an earlier case. Results are processed in generation order.
 * For deterministic generators and independent, repeatable properties, changing concurrency preserves the result,
 * including the selected failure, run and discard counts, shrinks, and replay token. Later cases may execute
 * speculatively. Their fibers are interrupted and awaited before shrinking or returning. Shrinking stays sequential.
 *
 * `maxShrinks` bounds the number of shrink candidates inspected after the initial failure. Candidates rejected by a
 * Schema check, `filter`, `filterMap`, or dependent generation consume the same budget even though the property is not
 * evaluated. Candidates that produce a different failure class also consume the budget. When the budget is exhausted,
 * checking returns the best shrunk input found so far. The `shrinks` field in a `Falsified` result counts only
 * candidates that were accepted as smaller failures.
 *
 * **Gotchas**
 *
 * When `replay` is present, its recorded seed, attempt, size, and shrink path control the run. The `runs`, `size`,
 * `maxDiscards`, `maxShrinks`, `seed`, and `concurrency` options are ignored. Replay stays sequential.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface CheckOptions {
  readonly runs?: number | undefined
  readonly concurrency?: number | undefined
  readonly size?: number | undefined
  readonly maxDiscards?: number | undefined
  readonly maxShrinks?: number | undefined
  readonly seed?: string | number | undefined
  readonly replay?: Replay | undefined
}

/**
 * Independent defaults for property checking and sampling, excluding replay tokens.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface GlobalOptions {
  readonly check?: Omit<CheckOptions, "replay"> | undefined
  readonly sample?: SampleOptions | undefined
}

/**
 * Replaces the defaults used by {@link checkEffect} and {@link sampleEffect}.
 *
 * **Details**
 *
 * Options are resolved once per execution: explicit non-`undefined` values, then configured defaults, then built-in
 * defaults. The supplied configuration is copied. Pass `{}` to reset it. Replay tokens retain control of replayed checks.
 *
 * **Gotchas**
 *
 * Configure defaults before starting concurrent tests. Changes affect subsequent executions, including Effects created
 * earlier, but do not affect active runs.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export const configureGlobal = Internal.configureGlobal

/**
 * Identifies a property that returned `false`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ReturnedFalse {
  readonly _tag: "ReturnedFalse"
}

/**
 * Preserves a typed failure produced by an effectful property.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface PropertyError<out E> {
  readonly _tag: "PropertyError"
  readonly error: E
}

/**
 * Represents the reason a property was falsified.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type PropertyFailure<E> = ReturnedFalse | PropertyError<E>

/**
 * Reports that every requested property run passed.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Passed {
  readonly _tag: "Passed"
  readonly runs: number
  readonly discards: number
}

/**
 * Reports a generated failure and its shrunk input.
 *
 * **Details**
 *
 * `initialInput` is the generated value that first falsified the property. `shrunkInput` is the best failing value found
 * by the bounded shrink search and may be equal to `initialInput`.
 *
 * `runs` counts main property evaluations through the falsifying evaluation. It excludes evaluations performed while
 * shrinking. A replay reports one run.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Falsified<out A, out E> {
  readonly _tag: "Falsified"
  readonly initialInput: A
  readonly shrunkInput: A
  readonly failure: PropertyFailure<E>
  readonly runs: number
  readonly discards: number
  readonly shrinks: number
  readonly replay: Replay
}

/**
 * Reports that bounded generation discarded too many candidates.
 *
 * **Details**
 *
 * The effective `seed` can be passed to {@link checkEffect} to reproduce the exhausted run, including when checking
 * originally selected a seed from the Effect `Random` service.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Exhausted {
  readonly _tag: "Exhausted"
  readonly runs: number
  readonly discards: number
  readonly seed: string | number
}

/**
 * Reports that replay coordinates no longer reproduce the recorded failure class.
 *
 * **Details**
 *
 * - `PropertyPassed` means that the regenerated root passed.
 * - `ShrinkPassed` means that the root switched failure class, or that a recorded shrink either passed or switched
 *   failure class.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ReplayMismatch {
  readonly _tag: "ReplayMismatch"
  readonly reason: "AttemptDiscarded" | "PropertyPassed" | "ShrinkPathUnavailable" | "ShrinkPassed"
}

/**
 * Represents every ordinary outcome of property checking.
 *
 * **Details**
 *
 * Defects and fiber interruption are not converted to this data type and continue through the returned `Effect`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type CheckResult<A, E> = Passed | Falsified<A, E> | Exhausted | ReplayMismatch

/**
 * Formats an unsuccessful property-check result as a diagnostic message, returning `undefined` for a passed result.
 *
 * **When to use**
 *
 * Use when integrating `checkEffect` with a test runner or another reporting interface.
 *
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export function formatCheckFailure<A, E>(result: CheckResult<A, E>): string | undefined {
  switch (result._tag) {
    case "Passed":
      return undefined
    case "Falsified":
      return `Property falsified after ${result.runs} run(s) and ${result.shrinks} shrink(s)\n` +
        `Shrunk input: ${Formatter.format(result.shrunkInput, { space: 2 })}\n` +
        `${
          result.failure._tag === "ReturnedFalse"
            ? "Failure: returned false"
            : `Failure: ${
              Cause.isCause(result.failure.error)
                ? Cause.pretty(result.failure.error)
                : Formatter.format(result.failure.error, { space: 2 })
            }`
        }\n` +
        `Replay: ${result.replay}`
    case "Exhausted":
      return `Property exhausted after ${result.runs} run(s) and ${result.discards} discard(s)\n` +
        `Seed: ${Formatter.format(result.seed, { space: 2 })}`
    case "ReplayMismatch":
      return `Property replay failed: ${result.reason}`
  }
}

/**
 * Derives an `Arbitrary` from the decoded `Type` of a Schema.
 *
 * **When to use**
 *
 * Use when you want Schema-aware generation without exposing a third-party property-testing engine.
 *
 * **Details**
 *
 * When `options.shrink` is provided, generated roots still come from Schema derivation, while the callback defines the
 * complete shrink tree. Invalid candidates are skipped and count against `maxShrinks` without reaching the property.
 *
 * **Gotchas**
 *
 * Derivation is immediate and throws when the current unstable implementation cannot compile the Schema or prove a
 * finite route through a recursive component.
 *
 * A custom shrinker replaces Schema-derived shrinking. It is evaluated lazily after a property failure and must be
 * synchronous, deterministic, terminating, and free of mutation.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export function schema<S extends Schema_.Constraint>(
  schema: S,
  options?: SchemaOptions<S["Type"]>
): Arbitrary<S["Type"]> {
  return Internal.schema(schema, options)
}

/**
 * Creates an `Arbitrary` that always generates `value` and has no shrink candidates.
 *
 * **When to use**
 *
 * Use when a branch of dependent generation should produce an already constructed value.
 *
 * **Gotchas**
 *
 * Every generation returns the same value. Objects are not cloned, so properties must not mutate them.
 *
 * @see {@link flatMap} for selecting dependent Arbitraries
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export function Constant<const A>(value: A): Arbitrary<A> {
  return Internal.constant(value)
}

/**
 * Generates variable-length arrays from an existing element `Arbitrary`.
 *
 * **When to use**
 *
 * Use when generating command sequences or collections whose elements are built with Arbitrary composition.
 *
 * **Details**
 *
 * Shrinking tries removing blocks, including prefixes and interior blocks, while preserving the order and values of
 * retained elements. It also tries the elements' own shrink candidates. Length bounds remain valid during shrinking,
 * and elements share the generation budget for recursion.
 *
 * **Gotchas**
 *
 * Invalid length bounds throw a `RangeError` when this function is called. Retained objects are not cloned, so
 * properties must not mutate generated values. Bounded shrinking does not guarantee a globally minimal failure.
 *
 * **Example** (Removing irrelevant commands)
 *
 * ```ts import.meta.vitest
 * import { Arbitrary, Effect, Schema } from "effect"
 *
 * const command = Arbitrary.schema(Schema.Literals(["Add", "Reset", "Stop"]))
 * const commands = Arbitrary.array(command, { maxLength: 50 })
 * const result = await Effect.runPromise(
 *   Arbitrary.checkEffect(commands, (values) => {
 *     // The state machine fails when Reset occurs before a later Stop.
 *     const reset = values.indexOf("Reset")
 *     return reset === -1 || !values.slice(reset + 1).includes("Stop")
 *   }, { runs: 1, size: 4, seed: 0 })
 * )
 *
 * result._tag // => "Falsified"
 * if (result._tag === "Falsified") {
 *   result.initialInput // => ["Add", "Add", "Reset", "Stop"]
 *   result.shrunkInput // => ["Reset", "Stop"]
 * }
 * ```
 *
 * @see {@link ArrayOptions} for length bounds
 * @see {@link all} for fixed tuples and records of Arbitraries
 * @see {@link schema} for deriving arrays described by Schema
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const array: <A>(item: Arbitrary<A>, options?: ArrayOptions) => Arbitrary<Array<A>> = Internal.array

/**
 * Transforms every generated value and its shrink candidates.
 *
 * **When to use**
 *
 * Use when you want to derive generated values from an existing `Arbitrary` without changing its generation or shrink
 * structure.
 *
 * @stability unstable
 * @category mapping
 * @since 4.0.0
 */
export const map: {
  <A, B>(f: (value: A) => B): (self: Arbitrary<A>) => Arbitrary<B>
  <A, B>(self: Arbitrary<A>, f: (value: A) => B): Arbitrary<B>
} = dual(2, <A, B>(self: Arbitrary<A>, f: (value: A) => B): Arbitrary<B> => Internal.map(self, f))

/**
 * Keeps generated values and shrink candidates that satisfy a predicate or refinement.
 *
 * **When to use**
 *
 * Use when a condition cannot be expressed constructively by the source Schema or after values have been transformed.
 *
 * **Gotchas**
 *
 * Rejected generated values count against `maxDiscards`. Prefer Schema checks when possible because the Schema compiler
 * may generate matching values directly.
 *
 * @see {@link filterMap} for transforming and filtering simultaneously
 * @stability unstable
 * @category filtering
 * @since 4.0.0
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Arbitrary<A>) => Arbitrary<B>
  <A>(predicate: Predicate<A>): <B extends A>(self: Arbitrary<B>) => Arbitrary<B>
  <A, B extends A>(self: Arbitrary<A>, refinement: Refinement<A, B>): Arbitrary<B>
  <A>(self: Arbitrary<A>, predicate: Predicate<A>): Arbitrary<A>
} = dual(2, <A>(self: Arbitrary<A>, predicate: Predicate<A>): Arbitrary<A> => Internal.filter(self, predicate))

/**
 * Transforms accepted generated values and discards rejected values.
 *
 * **When to use**
 *
 * Use when transformation and validation need to happen in one step after constructing an `Arbitrary`.
 *
 * **Gotchas**
 *
 * Failed filters discard generated roots and count against `maxDiscards`. Failures are not exposed in sampling or
 * checking results.
 *
 * @see {@link map} for transformations that cannot reject
 * @see {@link filter} for retaining original values that satisfy a condition
 * @stability unstable
 * @category filtering
 * @since 4.0.0
 */
export const filterMap: {
  <A, B, X>(f: Filter.Filter<A, B, X>): (self: Arbitrary<A>) => Arbitrary<B>
  <A, B, X>(self: Arbitrary<A>, f: Filter.Filter<A, B, X>): Arbitrary<B>
} = dual(
  2,
  <A, B, X>(self: Arbitrary<A>, f: Filter.Filter<A, B, X>): Arbitrary<B> => Internal.filterMap(self, f)
)

/**
 * Sequentially selects an `Arbitrary` from a generated value.
 *
 * **When to use**
 *
 * Use when the domain or shape of a generated value depends on another generated value.
 *
 * **Details**
 *
 * Shrinking first tries smaller source values and regenerates their dependent Arbitraries. It then shrinks the
 * selected dependent value. After a dependent shrink is selected, source shrinking is closed for that branch.
 *
 * **Gotchas**
 *
 * The callback must be synchronous, deterministic, and terminating. It can be evaluated again during shrinking and
 * replay. Deriving a Schema inside the callback also repeats that derivation, so precompile finite dependent
 * Arbitraries when possible.
 *
 * @see {@link map} for total transformations that do not select another Arbitrary
 * @see {@link Constant} for dependent branches that return an existing value
 * @stability unstable
 * @category sequencing
 * @since 4.0.0
 */
export const flatMap: {
  <A, B>(f: (value: A) => Arbitrary<B>): (self: Arbitrary<A>) => Arbitrary<B>
  <A, B>(self: Arbitrary<A>, f: (value: A) => Arbitrary<B>): Arbitrary<B>
} = dual(2, <A, B>(self: Arbitrary<A>, f: (value: A) => Arbitrary<B>): Arbitrary<B> => Internal.flatMap(self, f))

/**
 * Combines Arbitraries into one `Arbitrary` whose generated value mirrors the input shape.
 *
 * **When to use**
 *
 * Use when you need to generate several independent values together.
 *
 * **Details**
 *
 * Accepts a tuple or array, an iterable, or a record of Arbitraries. Tuple positions and record keys are preserved in
 * the generated value. Members are generated in a randomized internal order so recursive members share the generation
 * budget fairly, while shrinking changes one member at a time.
 *
 * **Gotchas**
 *
 * Iterable inputs are consumed when `all` is called. If any member discards a generated root, the complete generated
 * value is discarded.
 *
 * @see {@link array} for variable-length arrays that shrink by removing elements
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export function all<const Input extends Iterable<Arbitrary<any>> | Record<string, Arbitrary<any>>>(
  input: Input
): Arbitrary<
  [Input] extends [ReadonlyArray<Arbitrary<any>>] ? {
      -readonly [K in keyof Input]: [Input[K]] extends [Arbitrary<infer A>] ? A : never
    }
    : [Input] extends [Iterable<Arbitrary<infer A>>] ? Array<A>
    : [Input] extends [Record<string, Arbitrary<any>>] ? {
        -readonly [K in keyof Input]: [Input[K]] extends [Arbitrary<infer A>] ? A : never
      }
    : never
> {
  return Internal.all(input)
}

/**
 * Generates a bounded collection of values from an `Arbitrary`.
 *
 * **When to use**
 *
 * Use when you need generated examples without running a property.
 *
 * @stability unstable
 * @category running
 * @since 4.0.0
 */
export function sampleEffect<A>(
  self: Arbitrary<A>,
  options?: SampleOptions
): Effect.Effect<ReadonlyArray<A>, SampleError> {
  return Internal.sampleEffect(self, options)
}

/**
 * Checks a pure or effectful property and shrinks the first falsification.
 *
 * **When to use**
 *
 * Use when you want deterministic, interruptible property checking with typed property failures and replay.
 *
 * **Details**
 *
 * Returning `false` and failing an Effect are shrinkable falsifications. Shrinking preserves which of these two
 * failure classes caused the initial falsification. Typed error values may change while shrinking and are not compared
 * for equality. Defects and interruption continue through the returned Effect instead of becoming `CheckResult`
 * values.
 *
 * **Gotchas**
 *
 * Properties must treat generated values as immutable. The runner does not clone values before evaluation, so
 * mutation can change reported shrunk inputs or interfere with shrinking and replay.
 *
 * A property must also produce the same outcome for the same input and initial environment. The runner may evaluate
 * it repeatedly and does not restore mutable services between evaluations. Stateful properties should acquire and
 * release an independent fixture inside each evaluation. Concurrent evaluations inherit the provided services;
 * the runner does not rebuild layers. Their outcomes must not depend on scheduling or shared mutable state.
 *
 * @stability unstable
 * @category running
 * @since 4.0.0
 */
export function checkEffect<A, E = never, R = never>(
  self: Arbitrary<A>,
  property: (value: A) => boolean | Effect.Effect<boolean, E, R>,
  options?: CheckOptions
): Effect.Effect<CheckResult<A, E>, never, R> {
  return Internal.checkEffect(self, property, options)
}

/**
 * Placeholder for the value that an earlier command returned, used by later commands in a {@link Commands} sequence.
 *
 * **When to use**
 *
 * Use when a command needs a value that only exists once the system runs, such as an id or a handle created by an
 * earlier command. Store the reference that {@link Command.next} receives in the model, and generate arguments that
 * contain it.
 *
 * **Details**
 *
 * Generation, shrinking, preconditions, and next-state steps only see the placeholder. While {@link runCommands}
 * executes a sequence, {@link Command.run}, {@link Command.postcondition}, and the invariant receive a {@link Resolve}
 * function that returns the success value of the command that defined a reference. `id` is the position of the
 * defining command in the originally generated sequence, so it stays stable while shrinking removes commands. A
 * reference formats as `$<id>`.
 *
 * **Gotchas**
 *
 * References are compared by identity. Use them as `Map` keys or with `===`, and never construct them yourself.
 *
 * @stability unstable
 * @category models
 * @since 4.1.2
 */
export interface Reference<out A> {
  readonly "~effect/arbitrary/Reference": "~effect/arbitrary/Reference"
  readonly "~A": Types.Covariant<A>
  readonly id: number
}

/**
 * Returns the value behind a {@link Reference} while {@link runCommands} executes a sequence.
 *
 * **Details**
 *
 * The value is the success value of the command that defined the reference. {@link Command.run},
 * {@link Command.postcondition}, and the invariant of {@link CommandsOptions} receive this function, so a command
 * resolves exactly the references it needs, wherever its arguments or model keep them.
 *
 * **Gotchas**
 *
 * Resolving a reference whose command failed throws. A model can only produce such a reference by accepting the
 * failure in a postcondition while keeping the reference. The throw is a defect of the command, or the cause of the
 * failing postcondition or invariant.
 *
 * @stability unstable
 * @category models
 * @since 4.1.2
 */
export type Resolve = <A>(reference: Reference<A>) => A

/**
 * Describes one operation of a model-based test: how to generate it from the model state, when it is allowed, how
 * it changes the model, how to run it against the real system, and which results are correct.
 *
 * **When to use**
 *
 * Use with {@link commands} to generate sequences of operations, and {@link command} to infer the type parameters.
 *
 * **Details**
 *
 * - `args` returns the Arbitrary for the arguments in the current model state, or `undefined` when the command is not
 *   available in that state. Omit it for a command without arguments. Shrinking rechecks availability after removing
 *   earlier commands.
 * - `precondition` decides whether the command is allowed with these arguments in this model state. Generation retries
 *   rejected candidates, and shrinking rechecks it after removing earlier commands.
 * - `next` returns the model after the command. It receives a {@link Reference} to the command's result. Omit it for a
 *   command that does not change the model.
 * - `run` receives the generated arguments and a {@link Resolve} function for the references they contain.
 * - `postcondition` receives the model before the command, the arguments, the command's `Exit`, and a
 *   {@link Resolve} function, so it can compare results with values returned by earlier commands. Expected failures
 *   are part of the model. Omit it to require success. Interruption is never passed to the postcondition; it
 *   interrupts the run.
 *
 * **Gotchas**
 *
 * The model is symbolic: it is computed during generation without running anything, so `next` only sees references,
 * never results. `args`, `precondition`, and `next` must be synchronous, deterministic, and free of mutation. Models
 * and arguments must be treated as immutable because shrinking reuses them.
 *
 * @see {@link commands} for generating command sequences
 * @see {@link runCommands} for running a sequence against the real system
 * @stability unstable
 * @category models
 * @since 4.1.2
 */
export interface Command<M, Args, A, E, R> {
  readonly name: string
  // Method signatures keep commands with different argument, result, and error types assignable to one list.
  args?(model: M): Arbitrary<Args> | undefined
  precondition?(model: M, args: Args): boolean
  next?(model: M, args: Args, result: Reference<A>): M
  run(args: Args, resolve: Resolve): Effect.Effect<A, E, R>
  postcondition?(model: M, args: Args, exit: Exit.Exit<A, E>, resolve: Resolve): boolean
}

/**
 * Configures {@link commands}.
 *
 * **Details**
 *
 * - `initial` is the model before the first command.
 * - `commands` lists the available commands. Their names must be unique.
 * - `invariant` is checked before the first command and after every command, over the current model. It receives a
 *   {@link Resolve} function and can be an Effect that inspects the real system through its requirements. Returning
 *   anything but `true`, failing, or throwing fails the run.
 * - `maxCommands` caps the sequence length, which otherwise follows the check's `size`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.2
 */
export interface CommandsOptions<M, R> {
  readonly initial: M
  readonly commands: ReadonlyArray<Command<M, any, any, any, R>>
  readonly invariant?: ((model: M, resolve: Resolve) => boolean | Effect.Effect<boolean, unknown, R>) | undefined
  readonly maxCommands?: number | undefined
}

/**
 * One generated command in a {@link Commands} sequence.
 *
 * **Details**
 *
 * `args` are the symbolic arguments and may contain references. `reference` is the placeholder for this command's
 * result.
 *
 * @stability unstable
 * @category models
 * @since 4.1.2
 */
export interface CommandCall {
  readonly command: string
  readonly args: unknown
  readonly reference: Reference<unknown>
}

/**
 * A generated sequence of commands that the model allows, produced by {@link commands} and run by
 * {@link runCommands}.
 *
 * **Details**
 *
 * A sequence formats as one line per command, `$<id> = name(args)`, so counterexamples read as programs.
 *
 * @stability unstable
 * @category models
 * @since 4.1.2
 */
export interface Commands<out M, out R> {
  readonly "~M": Types.Covariant<M>
  readonly "~R": Types.Covariant<R>
  readonly steps: ReadonlyArray<CommandCall>
}

/**
 * One executed command in the trace of {@link runCommands}.
 *
 * **Details**
 *
 * `model` is the model before the command and `exit` is the command's result.
 *
 * @stability unstable
 * @category models
 * @since 4.1.2
 */
export interface CommandStep<out M> extends CommandCall {
  readonly model: M
  readonly exit: Exit.Exit<unknown, unknown>
}

/**
 * Counts how often a command ran in one sequence and how many of its candidates generation rejected.
 *
 * **Details**
 *
 * `rejected` counts the candidates of this command that were rejected by its precondition or discarded by its
 * argument Arbitrary while generating the sequence. It is zero for sequences produced by shrinking. Sum the counts of
 * every evaluation to find commands that never ran.
 *
 * @stability unstable
 * @category models
 * @since 4.1.2
 */
export interface CommandCount {
  readonly name: string
  readonly runs: number
  readonly rejected: number
}

/**
 * Reports a sequence whose every postcondition and invariant held.
 *
 * **Details**
 *
 * `steps` is the executed trace, `model` is the final model, and `counts` has one entry per command in the order of
 * {@link CommandsOptions.commands}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.2
 */
export interface CommandsRun<out M> {
  readonly steps: ReadonlyArray<CommandStep<M>>
  readonly model: M
  readonly counts: ReadonlyArray<CommandCount>
}

/**
 * Reports the command whose postcondition, or the invariant after it, failed.
 *
 * **Details**
 *
 * `steps` is the executed trace ending with the failing command, and `model` is the model after it. When the invariant
 * fails before the first command, `steps` is empty and `model` is the initial model. `cause` is present when the
 * postcondition or invariant threw, or when the invariant Effect failed.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.2
 */
export interface CommandsFailure<out M> extends CommandsRun<M> {
  readonly _tag: "CommandsFailure"
  readonly reason: "Postcondition" | "Invariant"
  readonly cause?: Cause.Cause<unknown> | undefined
}

/**
 * Defines a {@link Command} and infers its type parameters.
 *
 * **When to use**
 *
 * Use to declare each command once with full inference, then pass the commands to {@link commands}. Annotate the
 * model parameter of one callback so the model type is known.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.2
 */
export const command = <M, Args = undefined, A = void, E = never, R = never>(
  command: Command<M, Args, A, E, R>
): Command<M, Args, A, E, R> => command

/**
 * Generates sequences of commands that the model allows, for model-based testing of a stateful system.
 *
 * **When to use**
 *
 * Use when a system is easier to describe by a small model than by laws: the check generates operation sequences,
 * {@link runCommands} runs them against the real system, and every result is compared with the model.
 *
 * **Details**
 *
 * The sequence length grows with the check's `size` and is capped by `maxCommands`. Each position draws a command
 * whose `args` is available in the current model, generates its arguments, and retries rejected candidates; when no
 * candidate is accepted the sequence ends early. Every accepted command advances the model with `next` and defines a
 * {@link Reference} to its result.
 *
 * Shrinking removes commands, in progressively smaller blocks at each position, and shrinks the arguments of the
 * remaining commands. After every change it replays the model from `initial`, drops each command that is no longer
 * available, whose precondition fails, or whose arguments use a reference that is no longer defined, and continues
 * with the commands after it. References are found in arrays, `Map` and `Set` entries, and the own enumerable
 * properties of objects in the arguments.
 *
 * Pass the sequence to {@link checkEffect} with {@link runCommands} as the property, so replay tokens and
 * concurrency work as for any other property.
 *
 * **Gotchas**
 *
 * Invalid options and duplicate command names throw when this function is called. Each evaluation must run against
 * a fresh system, for example by providing a new layer inside the property. A reference kept only in a closure or a
 * private field is not found while shrinking, so its command may be removed while the reference is still used.
 *
 * **Example** (Finding a lost update in a counter store)
 *
 * ```ts import.meta.vitest
 * import { Arbitrary, Context, Effect, Exit, Schema } from "effect"
 *
 * class Store extends Context.Service<Store, {
 *   readonly create: Effect.Effect<number>
 *   readonly increment: (id: number) => Effect.Effect<void>
 *   readonly get: (id: number) => Effect.Effect<number>
 * }>()("Store") {}
 *
 * // The bug: the store stops counting after two increments.
 * const makeStore = () => {
 *   const counters: Array<number> = []
 *   return Store.of({
 *     create: Effect.sync(() => counters.push(0) - 1),
 *     increment: (id) =>
 *       Effect.sync(() => {
 *         counters[id] = Math.min(counters[id] + 1, 2)
 *       }),
 *     get: (id) => Effect.sync(() => counters[id])
 *   })
 * }
 *
 * type Model = ReadonlyMap<Arbitrary.Reference<number>, number>
 * const counter = (model: Model) =>
 *   model.size === 0
 *     ? undefined
 *     : Arbitrary.schema(Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: model.size - 1 }))).pipe(
 *       Arbitrary.map((index) => [...model.keys()][index])
 *     )
 *
 * const commands = Arbitrary.commands({
 *   initial: new Map() as Model,
 *   commands: [
 *     Arbitrary.command({
 *       name: "create",
 *       next: (model: Model, _, id) => new Map(model).set(id, 0),
 *       run: () => Store.use((store) => store.create)
 *     }),
 *     Arbitrary.command({
 *       name: "increment",
 *       args: counter,
 *       next: (model: Model, id) => new Map(model).set(id, model.get(id)! + 1),
 *       run: (id, resolve) => Store.use((store) => store.increment(resolve(id)))
 *     }),
 *     Arbitrary.command({
 *       name: "get",
 *       args: counter,
 *       run: (id, resolve) => Store.use((store) => store.get(resolve(id))),
 *       postcondition: (model: Model, id, exit) => Exit.isSuccess(exit) && exit.value === model.get(id)
 *     })
 *   ]
 * })
 *
 * const result = await Effect.runPromise(
 *   Arbitrary.checkEffect(commands, (sequence) =>
 *     Arbitrary.runCommands(sequence).pipe(
 *       Effect.as(true),
 *       Effect.provideService(Store, makeStore())
 *     ), { seed: 0, size: 20 })
 * )
 *
 * result._tag // => "Falsified"
 * if (result._tag === "Falsified") {
 *   const names = result.shrunkInput.steps.map((step) => step.command)
 *   names // => ["create", "increment", "increment", "increment", "get"]
 * }
 * ```
 *
 * @see {@link runCommands} for running a generated sequence
 * @see {@link array} for sequences without a model
 * @stability unstable
 * @category constructors
 * @since 4.1.2
 */
export const commands: <M, R = never>(options: CommandsOptions<M, R>) => Arbitrary<Commands<M, R>> =
  InternalCommands.commands

/**
 * Runs a generated command sequence against the real system and checks every result against the model.
 *
 * **When to use**
 *
 * Use as the property of {@link checkEffect} for a sequence generated by {@link commands}, mapping its success to
 * `true`.
 *
 * **Details**
 *
 * The invariant is checked on the initial model, then commands run in order. Each command receives its generated
 * arguments and a {@link Resolve} function for the references they contain. After each command, its postcondition
 * and then the invariant are checked. The first failure fails with {@link CommandsFailure}, whose trace ends at the
 * failing command. A successful run returns the trace, the final model, and per-command counts.
 *
 * **Gotchas**
 *
 * Interruption of a command or invariant interrupts the run instead of becoming a result.
 *
 * @see {@link commands} for generating sequences
 * @stability unstable
 * @category running
 * @since 4.1.2
 */
export const runCommands: <M, R>(commands: Commands<M, R>) => Effect.Effect<CommandsRun<M>, CommandsFailure<M>, R> =
  InternalCommands.runCommands
