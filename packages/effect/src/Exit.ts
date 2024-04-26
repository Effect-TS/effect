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
import type { NoInfer } from "./Types.js"
import type * as Unify from "./Unify.js"

/**
 * An `Exit<A, E = never>` describes the result of a executing an `Effect` workflow.
 *
 * There are two possible values for an `Exit<A, E>`:
 *   - `Exit.Success` contain a success value of type `A`
 *   - `Exit.Failure` contains a failure `Cause` of type `E`
 *
 * @since 2.0.0
 * @category models
 */
export type Exit<A, E = never> = Success<A, E> | Failure<A, E>

/**
 * Represents a failed `Effect` workflow containing the `Cause` of the failure
 * of type `E`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Failure<out A, out E> extends Effect.Effect<A, E>, Pipeable, Inspectable {
  readonly _tag: "Failure"
  readonly _op: "Failure"
  readonly cause: Cause.Cause<E>
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: ExitUnify<this>
  [Unify.ignoreSymbol]?: ExitUnifyIgnore
  /** @internal */
  readonly effect_instruction_i0: Cause.Cause<E>
}

/**
 * @category models
 * @since 2.0.0
 */
export interface ExitUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  Exit?: () => A[Unify.typeSymbol] extends Exit<infer A0, infer E0> | infer _ ? Exit<A0, E0> : never
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
export interface Success<out A, out E> extends Effect.Effect<A, E>, Pipeable, Inspectable {
  readonly _tag: "Success"
  readonly _op: "Success"
  readonly value: A
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: ExitUnify<this>
  [Unify.ignoreSymbol]?: ExitUnifyIgnore
  /** @internal */
  readonly effect_instruction_i0: A
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
export const isFailure: <A, E>(self: Exit<A, E>) => self is Failure<A, E> = core.exitIsFailure

/**
 * Returns `true` if the specified `Exit` is a `Success`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isSuccess: <A, E>(self: Exit<A, E>) => self is Success<A, E> = core.exitIsSuccess

/**
 * Returns `true` if the specified exit is a `Failure` **and** the `Cause` of
 * the failure was due to interruption, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isInterrupted: <A, E>(self: Exit<A, E>) => boolean = core.exitIsInterrupted

/**
 * Maps the `Success` value of the specified exit to the provided constant
 * value.
 *
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <A2>(value: A2): <A, E>(self: Exit<A, E>) => Exit<A2, E>
  <A, E, A2>(self: Exit<A, E>, value: A2): Exit<A2, E>
} = core.exitAs

/**
 * Maps the `Success` value of the specified exit to a void.
 *
 * @since 2.0.0
 * @category mapping
 */
export const asVoid: <A, E>(self: Exit<A, E>) => Exit<void, E> = core.exitAsVoid

/**
 * Returns a `Some<Cause<E>>` if the specified exit is a `Failure`, `None`
 * otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const causeOption: <A, E>(self: Exit<A, E>) => Option.Option<Cause.Cause<E>> = core.exitCauseOption

/**
 * Collects all of the specified exit values into a `Some<Exit<List<A>, E>>`. If
 * the provided iterable contains no elements, `None` will be returned.
 *
 * @since 2.0.0
 * @category constructors
 */
export const all: <A, E>(
  exits: Iterable<Exit<A, E>>,
  options?: { readonly parallel?: boolean | undefined } | undefined
) => Option.Option<Exit<Array<A>, E>> = core.exitCollectAll

/**
 * Constructs a new `Exit.Failure` from the specified unrecoverable defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Exit<never> = core.exitDie

/**
 * Executes the predicate on the value of the specified exit if it is a
 * `Success`, otherwise returns `false`.
 *
 * @since 2.0.0
 * @category elements
 */
export const exists: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): <E>(self: Exit<A, E>) => self is Exit<B>
  <A>(predicate: Predicate<NoInfer<A>>): <E>(self: Exit<A, E>) => boolean
  <A, E, B extends A>(self: Exit<A, E>, refinement: Refinement<A, B>): self is Exit<B>
  <A, E>(self: Exit<A, E>, predicate: Predicate<A>): boolean
} = core.exitExists

/**
 * Constructs a new `Exit.Failure` from the specified recoverable error of type
 * `E`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Exit<never, E> = core.exitFail

/**
 * Constructs a new `Exit.Failure` from the specified `Cause` of type `E`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Exit<never, E> = core.exitFailCause

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, A2, E2>(f: (a: A) => Exit<A2, E2>): <E>(self: Exit<A, E>) => Exit<A2, E2 | E>
  <A, E, E2, A2>(self: Exit<A, E>, f: (a: A) => Exit<A2, E2>): Exit<A2, E | E2>
} = core.exitFlatMap

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatMapEffect: {
  <A, E, A2, E2, R>(
    f: (a: A) => Effect.Effect<Exit<A2, E>, E2, R>
  ): (self: Exit<A, E>) => Effect.Effect<Exit<A2, E>, E2, R>
  <A, E, A2, E2, R>(self: Exit<A, E>, f: (a: A) => Effect.Effect<Exit<A2, E>, E2, R>): Effect.Effect<Exit<A2, E>, E2, R>
} = core.exitFlatMapEffect

/**
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: <A, E, E2>(self: Exit<Exit<A, E>, E2>) => Exit<A, E | E2> = core.exitFlatten

/**
 * @since 2.0.0
 * @category traversing
 */
export const forEachEffect: {
  <A, B, E2, R>(f: (a: A) => Effect.Effect<B, E2, R>): <E>(self: Exit<A, E>) => Effect.Effect<Exit<B, E2 | E>, never, R>
  <A, E, B, E2, R>(self: Exit<A, E>, f: (a: A) => Effect.Effect<B, E2, R>): Effect.Effect<Exit<B, E | E2>, never, R>
} = core.exitForEachEffect

/**
 * Converts an `Either<R, L>` into an `Exit<R, L>`.
 *
 * @since 2.0.0
 * @category conversions
 */
export const fromEither: <R, L>(either: Either.Either<R, L>) => Exit<R, L> = core.exitFromEither

/**
 * Converts an `Option<A>` into an `Exit<void, A>`.
 *
 * @since 2.0.0
 * @category conversions
 */
export const fromOption: <A>(option: Option.Option<A>) => Exit<A, void> = core.exitFromOption

/**
 * Returns the `A` if specified exit is a `Success`, otherwise returns the
 * alternate `A` value computed from the specified function which receives the
 * `Cause<E>` of the exit `Failure`.
 *
 * @since 2.0.0
 * @category getters
 */
export const getOrElse: {
  <E, A2>(orElse: (cause: Cause.Cause<E>) => A2): <A>(self: Exit<A, E>) => A2 | A
  <A, E, A2>(self: Exit<A, E>, orElse: (cause: Cause.Cause<E>) => A2): A | A2
} = core.exitGetOrElse

/**
 * Constructs a new `Exit.Failure` from the specified `FiberId` indicating that
 * the `Fiber` running an `Effect` workflow was terminated due to interruption.
 *
 * @since 2.0.0
 * @category constructors
 */
export const interrupt: (fiberId: FiberId.FiberId) => Exit<never> = core.exitInterrupt

/**
 * Maps over the `Success` value of the specified exit using the provided
 * function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <E>(self: Exit<A, E>) => Exit<B, E>
  <A, E, B>(self: Exit<A, E>, f: (a: A) => B): Exit<B, E>
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
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): (self: Exit<A, E>) => Exit<A2, E2>
  <A, E, E2, A2>(
    self: Exit<A, E>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): Exit<A2, E2>
} = core.exitMapBoth

/**
 * Maps over the error contained in the `Failure` of the specified exit using
 * the provided function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <A>(self: Exit<A, E>) => Exit<A, E2>
  <A, E, E2>(self: Exit<A, E>, f: (e: E) => E2): Exit<A, E2>
} = core.exitMapError

/**
 * Maps over the `Cause` contained in the `Failure` of the specified exit using
 * the provided function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <A>(self: Exit<A, E>) => Exit<A, E2>
  <E, A, E2>(self: Exit<A, E>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Exit<A, E2>
} = core.exitMapErrorCause

/**
 * @since 2.0.0
 * @category folding
 */
export const match: {
  <E, A, Z1, Z2>(
    options: { readonly onFailure: (cause: Cause.Cause<E>) => Z1; readonly onSuccess: (a: A) => Z2 }
  ): (self: Exit<A, E>) => Z1 | Z2
  <A, E, Z1, Z2>(
    self: Exit<A, E>,
    options: { readonly onFailure: (cause: Cause.Cause<E>) => Z1; readonly onSuccess: (a: A) => Z2 }
  ): Z1 | Z2
} = core.exitMatch

/**
 * @since 2.0.0
 * @category folding
 */
export const matchEffect: {
  <E, A2, E2, R, A, A3, E3, R2>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<A2, E2, R>
      readonly onSuccess: (a: A) => Effect.Effect<A3, E3, R2>
    }
  ): (self: Exit<A, E>) => Effect.Effect<A2 | A3, E2 | E3, R | R2>
  <A, E, A2, E2, R, A3, E3, R2>(
    self: Exit<A, E>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<A2, E2, R>
      readonly onSuccess: (a: A) => Effect.Effect<A3, E3, R2>
    }
  ): Effect.Effect<A2 | A3, E2 | E3, R | R2>
} = core.exitMatchEffect

/**
 * Constructs a new `Exit.Success` containing the specified value of type `A`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Exit<A> = core.exitSucceed

const void_: Exit<void> = core.exitVoid
export {
  /**
   * Represents an `Exit` which succeeds with `undefined`.
   *
   * @since 2.0.0
   * @category constructors
   */
  void_ as void
}

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zip: {
  <A2, E2>(that: Exit<A2, E2>): <A, E>(self: Exit<A, E>) => Exit<[A, A2], E2 | E>
  <A, E, A2, E2>(self: Exit<A, E>, that: Exit<A2, E2>): Exit<[A, A2], E | E2>
} = core.exitZip

/**
 * Sequentially zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <A2, E2>(that: Exit<A2, E2>): <A, E>(self: Exit<A, E>) => Exit<A, E2 | E>
  <A, E, A2, E2>(self: Exit<A, E>, that: Exit<A2, E2>): Exit<A, E | E2>
} = core.exitZipLeft

/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <A2, E2>(that: Exit<A2, E2>): <A, E>(self: Exit<A, E>) => Exit<A2, E2 | E>
  <A, E, A2, E2>(self: Exit<A, E>, that: Exit<A2, E2>): Exit<A2, E | E2>
} = core.exitZipRight

/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipPar: {
  <A2, E2>(that: Exit<A2, E2>): <A, E>(self: Exit<A, E>) => Exit<[A, A2], E2 | E>
  <A, E, A2, E2>(self: Exit<A, E>, that: Exit<A2, E2>): Exit<[A, A2], E | E2>
} = core.exitZipPar

/**
 * Parallelly zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipParLeft: {
  <A2, E2>(that: Exit<A2, E2>): <A, E>(self: Exit<A, E>) => Exit<A, E2 | E>
  <A, E, A2, E2>(self: Exit<A, E>, that: Exit<A2, E2>): Exit<A, E | E2>
} = core.exitZipParLeft

/**
 * Parallelly zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipParRight: {
  <A2, E2>(that: Exit<A2, E2>): <A, E>(self: Exit<A, E>) => Exit<A2, E2 | E>
  <A, E, A2, E2>(self: Exit<A, E>, that: Exit<A2, E2>): Exit<A2, E | E2>
} = core.exitZipParRight

/**
 * Zips this exit together with that exit using the specified combination
 * functions.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <B, E2, A, C, E>(
    that: Exit<B, E2>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<any>
    }
  ): (self: Exit<A, E>) => Exit<C, any>
  <A, E, B, E2, C>(
    self: Exit<A, E>,
    that: Exit<B, E2>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<E | E2>
    }
  ): Exit<C, E | E2>
} = core.exitZipWith
