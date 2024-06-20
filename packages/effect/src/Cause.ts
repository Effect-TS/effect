/**
 * The `Effect<A, E, R>` type is polymorphic in values of type `E` and we can
 * work with any error type that we want. However, there is a lot of information
 * that is not inside an arbitrary `E` value. So as a result, an `Effect` needs
 * somewhere to store things like unexpected errors or defects, stack and
 * execution traces, causes of fiber interruptions, and so forth.
 *
 * Effect-TS is very strict about preserving the full information related to a
 * failure. It captures all type of errors into the `Cause` data type. `Effect`
 * uses the `Cause<E>` data type to store the full story of failure. So its
 * error model is lossless. It doesn't throw information related to the failure
 * result. So we can figure out exactly what happened during the operation of
 * our effects.
 *
 * It is important to note that `Cause` is an underlying data type representing
 * errors occuring within an `Effect` workflow. Thus, we don't usually deal with
 * `Cause`s directly. Even though it is not a data type that we deal with very
 * often, the `Cause` of a failing `Effect` workflow can be accessed at any
 * time, which gives us total access to all parallel and sequential errors in
 * occurring within our codebase.
 *
 * @since 2.0.0
 */
import type * as Channel from "./Channel.js"
import type * as Chunk from "./Chunk.js"
import type * as Effect from "./Effect.js"
import type * as Either from "./Either.js"
import type * as Equal from "./Equal.js"
import type * as FiberId from "./FiberId.js"
import type * as HashSet from "./HashSet.js"
import type { Inspectable } from "./Inspectable.js"
import * as internal from "./internal/cause.js"
import * as core from "./internal/core.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import type * as Sink from "./Sink.js"
import type * as Stream from "./Stream.js"
import type { Span } from "./Tracer.js"
import type { Covariant, NoInfer } from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const CauseTypeId: unique symbol = internal.CauseTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type CauseTypeId = typeof CauseTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const RuntimeExceptionTypeId: unique symbol = core.RuntimeExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type RuntimeExceptionTypeId = typeof RuntimeExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const InterruptedExceptionTypeId: unique symbol = core.InterruptedExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type InterruptedExceptionTypeId = typeof InterruptedExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const IllegalArgumentExceptionTypeId: unique symbol = core.IllegalArgumentExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type IllegalArgumentExceptionTypeId = typeof IllegalArgumentExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const NoSuchElementExceptionTypeId: unique symbol = core.NoSuchElementExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type NoSuchElementExceptionTypeId = typeof NoSuchElementExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const InvalidPubSubCapacityExceptionTypeId: unique symbol = core.InvalidPubSubCapacityExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type InvalidPubSubCapacityExceptionTypeId = typeof InvalidPubSubCapacityExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const TimeoutExceptionTypeId: unique symbol = core.TimeoutExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TimeoutExceptionTypeId = typeof TimeoutExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const UnknownExceptionTypeId: unique symbol = core.UnknownExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type UnknownExceptionTypeId = typeof UnknownExceptionTypeId

/**
 * A `Cause` represents the full history of a failure resulting from running an
 * `Effect` workflow.
 *
 * Effect-TS uses a data structure from functional programming called a semiring
 * to represent the `Cause` data type. This allows us to take a base type `E`
 * (which represents the error type of an `Effect`) and capture the sequential
 * and parallel composition of errors in a fully lossless fashion.
 *
 * @since 2.0.0
 * @category models
 */
export type Cause<E> =
  | Empty
  | Fail<E>
  | Die
  | Interrupt
  | Sequential<E>
  | Parallel<E>

/**
 * @since 2.0.0
 */
export declare namespace Cause {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out E> {
    readonly [CauseTypeId]: {
      readonly _E: Covariant<E>
    }
  }
}

/**
 * Represents a set of methods that can be used to reduce a `Cause<E>` to a
 * specified value of type `Z` with access to a context of type `C`.
 *
 * @since 2.0.0
 * @category models
 */
export interface CauseReducer<in C, in E, in out Z> {
  emptyCase(context: C): Z
  failCase(context: C, error: E): Z
  dieCase(context: C, defect: unknown): Z
  interruptCase(context: C, fiberId: FiberId.FiberId): Z
  sequentialCase(context: C, left: Z, right: Z): Z
  parallelCase(context: C, left: Z, right: Z): Z
}

/**
 * @since 2.0.0
 * @category models
 */
export interface YieldableError extends Pipeable, Inspectable, Readonly<Error> {
  readonly [Effect.EffectTypeId]: Effect.Effect.VarianceStruct<never, this, never>
  readonly [Stream.StreamTypeId]: Stream.Stream.VarianceStruct<never, this, never>
  readonly [Sink.SinkTypeId]: Sink.Sink.VarianceStruct<never, unknown, never, this, never>
  readonly [Channel.ChannelTypeId]: Channel.Channel.VarianceStruct<never, unknown, this, unknown, never, unknown, never>
  [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<never, this, never>>
}

/**
 * Represents a generic checked exception which occurs at runtime.
 *
 * @since 2.0.0
 * @category errors
 */
export const YieldableError: new(message?: string | undefined) => YieldableError = core.YieldableError

/**
 * Represents a generic checked exception which occurs at runtime.
 *
 * @since 2.0.0
 * @category models
 */
export interface RuntimeException extends YieldableError {
  readonly _tag: "RuntimeException"
  readonly [RuntimeExceptionTypeId]: RuntimeExceptionTypeId
}

/**
 * Represents a checked exception which occurs when a `Fiber` is interrupted.
 *
 * @since 2.0.0
 * @category models
 */
export interface InterruptedException extends YieldableError {
  readonly _tag: "InterruptedException"
  readonly [InterruptedExceptionTypeId]: InterruptedExceptionTypeId
}

/**
 * Represents a checked exception which occurs when an invalid argument is
 * provided to a method.
 *
 * @since 2.0.0
 * @category models
 */
export interface IllegalArgumentException extends YieldableError {
  readonly _tag: "IllegalArgumentException"
  readonly [IllegalArgumentExceptionTypeId]: IllegalArgumentExceptionTypeId
}

/**
 * Represents a checked exception which occurs when an expected element was
 * unable to be found.
 *
 * @since 2.0.0
 * @category models
 */
export interface NoSuchElementException extends YieldableError {
  readonly _tag: "NoSuchElementException"
  readonly [NoSuchElementExceptionTypeId]: NoSuchElementExceptionTypeId
}

/**
 * Represents a checked exception which occurs when attempting to construct a
 * `PubSub` with an invalid capacity.
 *
 * @since 2.0.0
 * @category models
 */
export interface InvalidPubSubCapacityException extends YieldableError {
  readonly _tag: "InvalidPubSubCapacityException"
  readonly [InvalidPubSubCapacityExceptionTypeId]: InvalidPubSubCapacityExceptionTypeId
}

/**
 * Represents a checked exception which occurs when a computation doesn't
 * finish on schedule.
 *
 * @since 2.0.0
 * @category models
 */
export interface TimeoutException extends YieldableError {
  readonly _tag: "TimeoutException"
  readonly [TimeoutExceptionTypeId]: TimeoutExceptionTypeId
}

/**
 * Represents a checked exception which occurs when an unknown error is thrown, such as
 * from a rejected promise.
 *
 * @since 2.0.0
 * @category models
 */
export interface UnknownException extends YieldableError {
  readonly _tag: "UnknownException"
  readonly [UnknownExceptionTypeId]: UnknownExceptionTypeId
  readonly error: unknown
}

/**
 * The `Empty` cause represents a lack of errors.
 *
 * @since 2.0.0
 * @category models
 */
export interface Empty extends Cause.Variance<never>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Empty"
}

/**
 * The `Fail` cause represents a `Cause` which failed with an expected error of
 * type `E`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Fail<out E> extends Cause.Variance<E>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Fail"
  readonly error: E
}

/**
 * The `Die` cause represents a `Cause` which failed as a result of a defect, or
 * in other words, an unexpected error.
 *
 * type `E`.
 * @since 2.0.0
 * @category models
 */
export interface Die extends Cause.Variance<never>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Die"
  readonly defect: unknown
}

/**
 * The `Interrupt` cause represents failure due to `Fiber` interruption, which
 * contains the `FiberId` of the interrupted `Fiber`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Interrupt extends Cause.Variance<never>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Interrupt"
  readonly fiberId: FiberId.FiberId
}

/**
 * The `Parallel` cause represents the composition of two causes which occurred
 * in parallel.
 *
 * In Effect-TS programs, it is possible that two operations may be performed in
 * parallel. In these cases, the `Effect` workflow can fail for more than one
 * reason. If both computations fail, then there are actually two errors which
 * occurred in parallel. In these cases, the errors can be represented by the
 * `Parallel` cause.
 *
 * @since 2.0.0
 * @category models
 */
export interface Parallel<out E> extends Cause.Variance<E>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Parallel"
  readonly left: Cause<E>
  readonly right: Cause<E>
}

/**
 * The `Sequential` cause represents the composition of two causes which occurred
 * sequentially.
 *
 * For example, if we perform Effect-TS's analog of `try-finally` (i.e.
 * `Effect.ensuring`), and both the `try` and `finally` blocks fail, we have two
 * errors which occurred sequentially. In these cases, the errors can be
 * represented by the `Sequential` cause.
 *
 * @since 2.0.0
 * @category models
 */
export interface Sequential<out E> extends Cause.Variance<E>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Sequential"
  readonly left: Cause<E>
  readonly right: Cause<E>
}

/**
 * Constructs a new `Empty` cause.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: Cause<never> = internal.empty

/**
 * Constructs a new `Fail` cause from the specified `error`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Cause<E> = internal.fail

/**
 * Constructs a new `Die` cause from the specified `defect`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Cause<never> = internal.die

/**
 * Constructs a new `Interrupt` cause from the specified `fiberId`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const interrupt: (fiberId: FiberId.FiberId) => Cause<never> = internal.interrupt

/**
 * Constructs a new `Parallel` cause from the specified `left` and `right`
 * causes.
 *
 * @since 2.0.0
 * @category constructors
 */
export const parallel: <E, E2>(left: Cause<E>, right: Cause<E2>) => Cause<E | E2> = internal.parallel

/**
 * Constructs a new `Sequential` cause from the specified pecified `left` and
 * `right` causes.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sequential: <E, E2>(left: Cause<E>, right: Cause<E2>) => Cause<E | E2> = internal.sequential

/**
 * Returns `true` if the specified value is a `Cause`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isCause: (u: unknown) => u is Cause<never> = internal.isCause

/**
 * Returns `true` if the specified `Cause` is an `Empty` type, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isEmptyType: <E>(self: Cause<E>) => self is Empty = internal.isEmptyType

/**
 * Returns `true` if the specified `Cause` is a `Fail` type, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isFailType: <E>(self: Cause<E>) => self is Fail<E> = internal.isFailType

/**
 * Returns `true` if the specified `Cause` is a `Die` type, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isDieType: <E>(self: Cause<E>) => self is Die = internal.isDieType

/**
 * Returns `true` if the specified `Cause` is an `Interrupt` type, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isInterruptType: <E>(self: Cause<E>) => self is Interrupt = internal.isInterruptType

/**
 * Returns `true` if the specified `Cause` is a `Sequential` type, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isSequentialType: <E>(self: Cause<E>) => self is Sequential<E> = internal.isSequentialType

/**
 * Returns `true` if the specified `Cause` is a `Parallel` type, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isParallelType: <E>(self: Cause<E>) => self is Parallel<E> = internal.isParallelType

/**
 * Returns the size of the cause, calculated as the number of individual `Cause`
 * nodes found in the `Cause` semiring structure.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: <E>(self: Cause<E>) => number = internal.size

/**
 * Returns `true` if the specified cause is empty, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isEmpty: <E>(self: Cause<E>) => boolean = internal.isEmpty

/**
 * Returns `true` if the specified cause contains a failure, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isFailure: <E>(self: Cause<E>) => boolean = internal.isFailure

/**
 * Returns `true` if the specified cause contains a defect, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isDie: <E>(self: Cause<E>) => boolean = internal.isDie

/**
 * Returns `true` if the specified cause contains an interruption, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isInterrupted: <E>(self: Cause<E>) => boolean = internal.isInterrupted

/**
 * Returns `true` if the specified cause contains only interruptions (without
 * any `Die` or `Fail` causes), `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isInterruptedOnly: <E>(self: Cause<E>) => boolean = internal.isInterruptedOnly

/**
 * Returns a `List` of all recoverable errors of type `E` in the specified
 * cause.
 *
 * @since 2.0.0
 * @category getters
 */
export const failures: <E>(self: Cause<E>) => Chunk.Chunk<E> = internal.failures

/**
 * Returns a `List` of all unrecoverable defects in the specified cause.
 *
 * @since 2.0.0
 * @category getters
 */
export const defects: <E>(self: Cause<E>) => Chunk.Chunk<unknown> = internal.defects

/**
 * Returns a `HashSet` of `FiberId`s for all fibers that interrupted the fiber
 * described by the specified cause.
 *
 * @since 2.0.0
 * @category getters
 */
export const interruptors: <E>(self: Cause<E>) => HashSet.HashSet<FiberId.FiberId> = internal.interruptors

/**
 * Returns the `E` associated with the first `Fail` in this `Cause`, if one
 * exists.
 *
 * @since 2.0.0
 * @category getters
 */
export const failureOption: <E>(self: Cause<E>) => Option.Option<E> = internal.failureOption

/**
 * Returns the first checked error on the `Left` if available, if there are
 * no checked errors return the rest of the `Cause` that is known to contain
 * only `Die` or `Interrupt` causes.
 *
 * @since 2.0.0
 * @category getters
 */
export const failureOrCause: <E>(self: Cause<E>) => Either.Either<Cause<never>, E> = internal.failureOrCause

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>` by
 * recursively stripping out any failures with the error `None`.
 *
 * @since 2.0.0
 * @category getters
 */
export const flipCauseOption: <E>(self: Cause<Option.Option<E>>) => Option.Option<Cause<E>> = internal.flipCauseOption

/**
 * Returns the defect associated with the first `Die` in this `Cause`, if one
 * exists.
 *
 * @since 2.0.0
 * @category getters
 */
export const dieOption: <E>(self: Cause<E>) => Option.Option<unknown> = internal.dieOption

/**
 * Returns the `FiberId` associated with the first `Interrupt` in the specified
 * cause, if one exists.
 *
 * @since 2.0.0
 * @category getters
 */
export const interruptOption: <E>(self: Cause<E>) => Option.Option<FiberId.FiberId> = internal.interruptOption

/**
 * Remove all `Fail` and `Interrupt` nodes from the specified cause, and return
 * a cause containing only `Die` cause/finalizer defects.
 *
 * @since 2.0.0
 * @category getters
 */
export const keepDefects: <E>(self: Cause<E>) => Option.Option<Cause<never>> = internal.keepDefects

/**
 * Linearizes the specified cause into a `HashSet` of parallel causes where each
 * parallel cause contains a linear sequence of failures.
 *
 * @since 2.0.0
 * @category getters
 */
export const linearize: <E>(self: Cause<E>) => HashSet.HashSet<Cause<E>> = internal.linearize

/**
 * Remove all `Fail` and `Interrupt` nodes from the specified cause, and return
 * a cause containing only `Die` cause/finalizer defects.
 *
 * @since 2.0.0
 * @category getters
 */
export const stripFailures: <E>(self: Cause<E>) => Cause<never> = internal.stripFailures

/**
 * Remove all `Die` causes that the specified partial function is defined at,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 *
 * @since 2.0.0
 * @category getters
 */
export const stripSomeDefects: {
  (pf: (defect: unknown) => Option.Option<unknown>): <E>(self: Cause<E>) => Option.Option<Cause<E>>
  <E>(self: Cause<E>, pf: (defect: unknown) => Option.Option<unknown>): Option.Option<Cause<E>>
} = internal.stripSomeDefects

/**
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <E2>(error: E2): <E>(self: Cause<E>) => Cause<E2>
  <E, E2>(self: Cause<E>, error: E2): Cause<E2>
} = internal.as

/**
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <E, E2>(f: (e: E) => E2): (self: Cause<E>) => Cause<E2>
  <E, E2>(self: Cause<E>, f: (e: E) => E2): Cause<E2>
} = internal.map

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <E, E2>(f: (e: E) => Cause<E2>): (self: Cause<E>) => Cause<E2>
  <E, E2>(self: Cause<E>, f: (e: E) => Cause<E2>): Cause<E2>
} = internal.flatMap

/**
 * Executes a sequence of two `Cause`s. The second `Cause` can be dependent on the result of the first `Cause`.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const andThen: {
  <E, E2>(f: (e: E) => Cause<E2>): (self: Cause<E>) => Cause<E2>
  <E2>(f: Cause<E2>): <E>(self: Cause<E>) => Cause<E2>
  <E, E2>(self: Cause<E>, f: (e: E) => Cause<E2>): Cause<E2>
  <E, E2>(self: Cause<E>, f: Cause<E2>): Cause<E2>
} = internal.andThen

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: <E>(self: Cause<Cause<E>>) => Cause<E> = internal.flatten

/**
 * Returns `true` if the `self` cause contains or is equal to `that` cause,
 * `false` otherwise.
 *
 * @since 2.0.0
 * @category elements
 */
export const contains: {
  <E2>(that: Cause<E2>): <E>(self: Cause<E>) => boolean
  <E, E2>(self: Cause<E>, that: Cause<E2>): boolean
} = internal.contains

/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most important"
 * defect.
 *
 * @since 2.0.0
 * @category destructors
 */
export const squash: <E>(self: Cause<E>) => unknown = core.causeSquash

/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most important"
 * defect. If a recoverable error is found, the provided function will be used
 * to map the error a defect, and the resulting value will be returned.
 *
 * @since 2.0.0
 * @category destructors
 */
export const squashWith: {
  <E>(f: (error: E) => unknown): (self: Cause<E>) => unknown
  <E>(self: Cause<E>, f: (error: E) => unknown): unknown
} = core.causeSquashWith

/**
 * Uses the provided partial function to search the specified cause and attempt
 * to extract information from it.
 *
 * @since 2.0.0
 * @category elements
 */
export const find: {
  <E, Z>(pf: (cause: Cause<E>) => Option.Option<Z>): (self: Cause<E>) => Option.Option<Z>
  <E, Z>(self: Cause<E>, pf: (cause: Cause<E>) => Option.Option<Z>): Option.Option<Z>
} = internal.find

/**
 * Filters causes which match the provided predicate out of the specified cause.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filter: {
  <E, EB extends E>(refinement: Refinement<Cause<NoInfer<E>>, Cause<EB>>): (self: Cause<E>) => Cause<EB>
  <E>(predicate: Predicate<Cause<NoInfer<E>>>): (self: Cause<E>) => Cause<E>
  <E, EB extends E>(self: Cause<E>, refinement: Refinement<Cause<E>, Cause<EB>>): Cause<EB>
  <E>(self: Cause<E>, predicate: Predicate<Cause<E>>): Cause<E>
} = internal.filter

/**
 * Folds the specified cause into a value of type `Z`.
 *
 * @since 2.0.0
 * @category folding
 */
export const match: {
  <Z, E>(
    options: {
      readonly onEmpty: Z
      readonly onFail: (error: E) => Z
      readonly onDie: (defect: unknown) => Z
      readonly onInterrupt: (fiberId: FiberId.FiberId) => Z
      readonly onSequential: (left: Z, right: Z) => Z
      readonly onParallel: (left: Z, right: Z) => Z
    }
  ): (self: Cause<E>) => Z
  <Z, E>(
    self: Cause<E>,
    options: {
      readonly onEmpty: Z
      readonly onFail: (error: E) => Z
      readonly onDie: (defect: unknown) => Z
      readonly onInterrupt: (fiberId: FiberId.FiberId) => Z
      readonly onSequential: (left: Z, right: Z) => Z
      readonly onParallel: (left: Z, right: Z) => Z
    }
  ): Z
} = internal.match

/**
 * Reduces the specified cause into a value of type `Z`, beginning with the
 * provided `zero` value.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduce: {
  <Z, E>(zero: Z, pf: (accumulator: Z, cause: Cause<E>) => Option.Option<Z>): (self: Cause<E>) => Z
  <Z, E>(self: Cause<E>, zero: Z, pf: (accumulator: Z, cause: Cause<E>) => Option.Option<Z>): Z
} = internal.reduce

/**
 * Reduces the specified cause into a value of type `Z` using a `Cause.Reducer`.
 * Also allows for accessing the provided context during reduction.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduceWithContext: {
  <C, E, Z>(context: C, reducer: CauseReducer<C, E, Z>): (self: Cause<E>) => Z
  <C, E, Z>(self: Cause<E>, context: C, reducer: CauseReducer<C, E, Z>): Z
} = internal.reduceWithContext

/**
 * Represents a checked exception which occurs when a `Fiber` is interrupted.
 *
 * @since 2.0.0
 * @category errors
 */
export const InterruptedException: new(message?: string | undefined) => InterruptedException = core.InterruptedException

/**
 * Returns `true` if the specified value is an `InterruptedException`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isInterruptedException: (u: unknown) => u is InterruptedException = core.isInterruptedException

/**
 * Represents a checked exception which occurs when an invalid argument is
 * provided to a method.
 *
 * @since 2.0.0
 * @category errors
 */
export const IllegalArgumentException: new(message?: string | undefined) => IllegalArgumentException =
  core.IllegalArgumentException

/**
 * Returns `true` if the specified value is an `IllegalArgumentException`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isIllegalArgumentException: (u: unknown) => u is IllegalArgumentException = core.isIllegalArgumentException

/**
 * Represents a checked exception which occurs when an expected element was
 * unable to be found.
 *
 * @since 2.0.0
 * @category errors
 */
export const NoSuchElementException: new(message?: string | undefined) => NoSuchElementException =
  core.NoSuchElementException

/**
 * Returns `true` if the specified value is an `NoSuchElementException`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isNoSuchElementException: (u: unknown) => u is NoSuchElementException = core.isNoSuchElementException

/**
 * Represents a generic checked exception which occurs at runtime.
 *
 * @since 2.0.0
 * @category errors
 */
export const RuntimeException: new(message?: string | undefined) => RuntimeException = core.RuntimeException

/**
 * Returns `true` if the specified value is an `RuntimeException`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isRuntimeException: (u: unknown) => u is RuntimeException = core.isRuntimeException

/**
 * Represents a checked exception which occurs when a computation doesn't
 * finish on schedule.
 *
 * @since 2.0.0
 * @category errors
 */
export const TimeoutException: new(message?: string | undefined) => TimeoutException = core.TimeoutException

/**
 * Represents a checked exception which occurs when an unknown error is thrown, such as
 * from a rejected promise.
 *
 * @since 2.0.0
 * @category errors
 */
export const UnknownException: new(error: unknown, message?: string | undefined) => UnknownException =
  core.UnknownException

/**
 * Returns `true` if the specified value is an `UnknownException`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isUnknownException: (u: unknown) => u is UnknownException = core.isUnknownException

/**
 * Returns the specified `Cause` as a pretty-printed string.
 *
 * @since 2.0.0
 * @category rendering
 */
export const pretty: <E>(cause: Cause<E>) => string = internal.pretty

/**
 * @since 3.2.0
 * @category models
 */
export interface PrettyError extends Error {
  readonly span: Span | undefined
}

/**
 * Returns the specified `Cause` as a pretty-printed string.
 *
 * @since 3.2.0
 * @category rendering
 */
export const prettyErrors: <E>(cause: Cause<E>) => Array<PrettyError> = internal.prettyErrors

/**
 * Returns the original, unproxied, instance of a thrown error
 *
 * @since 2.0.0
 * @category errors
 */
export const originalError: <E>(obj: E) => E = core.originalInstance
