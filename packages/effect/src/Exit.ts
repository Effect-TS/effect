/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Effect from "./Effect.js"
import type * as Either from "./Either.js"
import type * as FiberId from "./FiberId.js"
import type { Inspectable } from "./Inspectable.js"
import * as core from "./internal/core.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import type * as Unify from "./Unify.js"

/**
 * An `Exit<E, A>` describes the result of a executing an `Effect` workflow.
 *
 * There are two possible values for an `Exit<E, A>`:
 *   - `Exit.Success` contain a success value of type `A`
 *   - `Exit.Failure` contains a failure `Cause` of type `E`
 *
 * @since 2.0.0
 * @category models
 */
export type Exit<E, A> = Failure<E, A> | Success<E, A>

/**
 * Represents a failed `Effect` workflow containing the `Cause` of the failure
 * of type `E`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Failure<out E, out A> extends Effect.Effect<never, E, A>, Pipeable, Inspectable {
  readonly _tag: "Failure"
  readonly _op: "Failure"
  readonly cause: Cause.Cause<E>
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: ExitUnify<this>
  [Unify.ignoreSymbol]?: ExitUnifyIgnore
  /** @internal */
  readonly i0: Cause.Cause<E>
}

/**
 * @category models
 * @since 2.0.0
 */
export interface ExitUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  Exit?: () => A[Unify.typeSymbol] extends Exit<infer E0, infer A0> | infer _ ? Exit<E0, A0> : never
}

/**
 * @category models
 * @since 2.0.0
 */
export interface ExitUnifyIgnore extends Effect.EffectUnifyIgnore {
  Effect?: true
}

/**
 * Represents a successful `Effect` workflow and containing the returned value
 * of type `A`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Success<out E, out A> extends Effect.Effect<never, E, A>, Pipeable, Inspectable {
  readonly _tag: "Success"
  readonly _op: "Success"
  readonly value: A
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: ExitUnify<this>
  [Unify.ignoreSymbol]?: ExitUnifyIgnore
  /** @internal */
  readonly i0: A
}

/**
 * Returns `true` if the specified value is an `Exit`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isExit: (u: unknown) => u is Exit<unknown, unknown> = core.exitIsExit

/**
 * Returns `true` if the specified `Exit` is a `Failure`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isFailure: <E, A>(self: Exit<E, A>) => self is Failure<E, A> = core.exitIsFailure

/**
 * Returns `true` if the specified `Exit` is a `Success`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isSuccess: <E, A>(self: Exit<E, A>) => self is Success<E, A> = core.exitIsSuccess

/**
 * Returns `true` if the specified exit is a `Failure` **and** the `Cause` of
 * the failure was due to interruption, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isInterrupted: <E, A>(self: Exit<E, A>) => boolean = core.exitIsInterrupted

/**
 * Maps the `Success` value of the specified exit to the provided constant
 * value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <A2>(value: A2): <E, A>(self: Exit<E, A>) => Exit<E, A2>
  <E, A, A2>(self: Exit<E, A>, value: A2): Exit<E, A2>
} = core.exitAs

/**
 * Maps the `Success` value of the specified exit to a void.
 *
 * @since 2.0.0
 * @category mapping
 */
export const asUnit: <E, A>(self: Exit<E, A>) => Exit<E, void> = core.exitAsUnit

/**
 * Returns a `Some<Cause<E>>` if the specified exit is a `Failure`, `None`
 * otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const causeOption: <E, A>(self: Exit<E, A>) => Option.Option<Cause.Cause<E>> = core.exitCauseOption

/**
 * Collects all of the specified exit values into a `Some<Exit<E, List<A>>>`. If
 * the provided iterable contains no elements, `None` will be returned.
 *
 * @since 2.0.0
 * @category constructors
 */
export const all: <E, A>(
  exits: Iterable<Exit<E, A>>,
  options?: {
    readonly parallel?: boolean | undefined
  }
) => Option.Option<Exit<E, Array<A>>> = core.exitCollectAll

/**
 * Constructs a new `Exit.Failure` from the specified unrecoverable defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Exit<never, never> = core.exitDie

/**
 * Executes the predicate on the value of the specified exit if it is a
 * `Success`, otherwise returns `false`.
 *
 * @since 2.0.0
 * @category elements
 */
export const exists: {
  <A, B extends A>(refinement: Refinement<A, B>): <E>(self: Exit<E, A>) => self is Exit<never, B>
  <A>(predicate: Predicate<A>): <E>(self: Exit<E, A>) => boolean
  <E, A, B extends A>(self: Exit<E, A>, refinement: Refinement<A, B>): self is Exit<never, B>
  <E, A>(self: Exit<E, A>, predicate: Predicate<A>): boolean
} = core.exitExists

/**
 * Constructs a new `Exit.Failure` from the specified recoverable error of type
 * `E`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Exit<E, never> = core.exitFail

/**
 * Constructs a new `Exit.Failure` from the specified `Cause` of type `E`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Exit<E, never> = core.exitFailCause

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, E2, A2>(f: (a: A) => Exit<E2, A2>): <E>(self: Exit<E, A>) => Exit<E2 | E, A2>
  <E, A, E2, A2>(self: Exit<E, A>, f: (a: A) => Exit<E2, A2>): Exit<E | E2, A2>
} = core.exitFlatMap

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatMapEffect: {
  <E, A, R, E2, A2>(
    f: (a: A) => Effect.Effect<R, E2, Exit<E, A2>>
  ): (self: Exit<E, A>) => Effect.Effect<R, E2, Exit<E, A2>>
  <E, A, R, E2, A2>(
    self: Exit<E, A>,
    f: (a: A) => Effect.Effect<R, E2, Exit<E, A2>>
  ): Effect.Effect<R, E2, Exit<E, A2>>
} = core.exitFlatMapEffect

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: <E, E1, A>(self: Exit<E, Exit<E1, A>>) => Exit<E | E1, A> = core.exitFlatten

/**
 * @since 2.0.0
 * @category traversing
 */
export const forEachEffect: {
  <A, R, E2, B>(f: (a: A) => Effect.Effect<R, E2, B>): <E>(self: Exit<E, A>) => Effect.Effect<R, never, Exit<E2 | E, B>>
  <E, A, R, E2, B>(self: Exit<E, A>, f: (a: A) => Effect.Effect<R, E2, B>): Effect.Effect<R, never, Exit<E | E2, B>>
} = core.exitForEachEffect

/**
 * Converts an `Either<E, A>` into an `Exit<E, A>`.
 *
 * @since 2.0.0
 * @category conversions
 */
export const fromEither: <E, A>(either: Either.Either<E, A>) => Exit<E, A> = core.exitFromEither

/**
 * Converts an `Option<A>` into an `Exit<void, A>`.
 *
 * @since 2.0.0
 * @category conversions
 */
export const fromOption: <A>(option: Option.Option<A>) => Exit<void, A> = core.exitFromOption

/**
 * Returns the `A` if specified exit is a `Success`, otherwise returns the
 * alternate `A` value computed from the specified function which receives the
 * `Cause<E>` of the exit `Failure`.
 *
 * @since 2.0.0
 * @category getters
 */
export const getOrElse: {
  <E, A2>(orElse: (cause: Cause.Cause<E>) => A2): <A1>(self: Exit<E, A1>) => A1 | A2
  <E, A1, A2>(self: Exit<E, A1>, orElse: (cause: Cause.Cause<E>) => A2): A1 | A2
} = core.exitGetOrElse

/**
 * Constructs a new `Exit.Failure` from the specified `FiberId` indicating that
 * the `Fiber` running an `Effect` workflow was terminated due to interruption.
 *
 * @since 2.0.0
 * @category constructors
 */
export const interrupt: (fiberId: FiberId.FiberId) => Exit<never, never> = core.exitInterrupt

/**
 * Maps over the `Success` value of the specified exit using the provided
 * function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <E>(self: Exit<E, A>) => Exit<E, B>
  <E, A, B>(self: Exit<E, A>, f: (a: A) => B): Exit<E, B>
} = core.exitMap

/**
 * Maps over the `Success` and `Failure` cases of the specified exit using the
 * provided functions.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapBoth: {
  <E, A, E2, A2>(
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ): (self: Exit<E, A>) => Exit<E2, A2>
  <E, A, E2, A2>(
    self: Exit<E, A>,
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ): Exit<E2, A2>
} = core.exitMapBoth

/**
 * Maps over the error contained in the `Failure` of the specified exit using
 * the provided function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <A>(self: Exit<E, A>) => Exit<E2, A>
  <E, A, E2>(self: Exit<E, A>, f: (e: E) => E2): Exit<E2, A>
} = core.exitMapError

/**
 * Maps over the `Cause` contained in the `Failure` of the specified exit using
 * the provided function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <A>(self: Exit<E, A>) => Exit<E2, A>
  <E, A, E2>(self: Exit<E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Exit<E2, A>
} = core.exitMapErrorCause

/**
 * @since 2.0.0
 * @category folding
 */
export const match: {
  <E, A, Z1, Z2>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Z1
      readonly onSuccess: (a: A) => Z2
    }
  ): (self: Exit<E, A>) => Z1 | Z2
  <E, A, Z1, Z2>(
    self: Exit<E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Z1
      readonly onSuccess: (a: A) => Z2
    }
  ): Z1 | Z2
} = core.exitMatch

/**
 * @since 2.0.0
 * @category folding
 */
export const matchEffect: {
  <E, A, R, E2, A2, R2, E3, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R2, E3, A3>
    }
  ): (self: Exit<E, A>) => Effect.Effect<R | R2, E2 | E3, A2 | A3>
  <E, A, R, E2, A2, R2, E3, A3>(
    self: Exit<E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R2, E3, A3>
    }
  ): Effect.Effect<R | R2, E2 | E3, A2 | A3>
} = core.exitMatchEffect

/**
 * Constructs a new `Exit.Success` containing the specified value of type `A`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Exit<never, A> = core.exitSucceed

/**
 * Represents an `Exit` which succeeds with `undefined`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unit: Exit<never, void> = core.exitUnit

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, [A, A2]>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, [A, A2]>
} = core.exitZip

/**
 * Sequentially zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, A>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, A>
} = core.exitZipLeft

/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, A2>
} = core.exitZipRight

/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipPar: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, [A, A2]>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, [A, A2]>
} = core.exitZipPar

/**
 * Parallelly zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipParLeft: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, A>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, A>
} = core.exitZipParLeft

/**
 * Parallelly zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipParRight: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, A2>
} = core.exitZipParRight

/**
 * Zips this exit together with that exit using the specified combination
 * functions.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <E, E2, A, B, C>(
    that: Exit<E2, B>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<E | E2>
    }
  ): (self: Exit<E, A>) => Exit<E | E2, C>
  <E, E2, A, B, C>(
    self: Exit<E, A>,
    that: Exit<E2, B>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<E | E2>
    }
  ): Exit<E | E2, C>
} = core.exitZipWith
