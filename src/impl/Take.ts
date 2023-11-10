/**
 * @since 2.0.0
 */
import type { Cause } from "../Cause.js"
import type { Chunk } from "../Chunk.js"
import type { Effect } from "../Effect.js"
import type { Exit } from "../Exit.js"
import * as internal from "../internal/take.js"
import type { Option } from "../Option.js"

import type { Take } from "../Take.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TakeTypeId: unique symbol = internal.TakeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TakeTypeId = typeof TakeTypeId

/**
 * Creates a `Take` with the specified chunk.
 *
 * @since 2.0.0
 * @category constructors
 */
export const chunk: <A>(chunk: Chunk<A>) => Take<never, A> = internal.chunk

/**
 * Creates a failing `Take` with the specified defect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Take<never, never> = internal.die

/**
 * Creates a failing `Take` with the specified error message.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => Take<never, never> = internal.dieMessage

/**
 * Transforms a `Take<E, A>` to an `Effect<never, E, A>`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const done: <E, A>(self: Take<E, A>) => Effect<never, Option<E>, Chunk<A>> = internal.done

/**
 * Represents the end-of-stream marker.
 *
 * @since 2.0.0
 * @category constructors
 */
export const end: Take<never, never> = internal.end

/**
 * Creates a failing `Take` with the specified error.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Take<E, never> = internal.fail

/**
 * Creates a failing `Take` with the specified cause.
 *
 * @since 2.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause<E>) => Take<E, never> = internal.failCause

/**
 * Creates an effect from `Effect<R, E, A>` that does not fail, but succeeds with
 * the `Take<E, A>`. Error from stream when pulling is converted to
 * `Take.failCause`. Creates a single value chunk.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEffect: <R, E, A>(effect: Effect<R, E, A>) => Effect<R, never, Take<E, A>> = internal.fromEffect

/**
 * Creates a `Take` from an `Exit`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromExit: <E, A>(exit: Exit<E, A>) => Take<E, A> = internal.fromExit

/**
 * Creates effect from `Effect<R, Option<E>, Chunk<A>>` that does not fail, but
 * succeeds with the `Take<E, A>`. Errors from stream when pulling are converted
 * to `Take.failCause`, and the end-of-stream is converted to `Take.end`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromPull: <R, E, A>(
  pull: Effect<R, Option<E>, Chunk<A>>
) => Effect<R, never, Take<E, A>> = internal.fromPull

/**
 * Checks if this `take` is done (`Take.end`).
 *
 * @since 2.0.0
 * @category getters
 */
export const isDone: <E, A>(self: Take<E, A>) => boolean = internal.isDone

/**
 * Checks if this `take` is a failure.
 *
 * @since 2.0.0
 * @category getters
 */
export const isFailure: <E, A>(self: Take<E, A>) => boolean = internal.isFailure

/**
 * Checks if this `take` is a success.
 *
 * @since 2.0.0
 * @category getters
 */
export const isSuccess: <E, A>(self: Take<E, A>) => boolean = internal.isSuccess

/**
 * Constructs a `Take`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <E, A>(exit: Exit<Option<E>, Chunk<A>>) => Take<E, A> = internal.make

/**
 * Transforms `Take<E, A>` to `Take<E, B>` by applying function `f`.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <E>(self: Take<E, A>) => Take<E, B>
  <E, A, B>(self: Take<E, A>, f: (a: A) => B): Take<E, B>
} = internal.map

/**
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield a value.
 *
 * @since 2.0.0
 * @category destructors
 */
export const match: {
  <Z, E, Z2, A, Z3>(
    options: {
      readonly onEnd: () => Z
      readonly onFailure: (cause: Cause<E>) => Z2
      readonly onSuccess: (chunk: Chunk<A>) => Z3
    }
  ): (self: Take<E, A>) => Z | Z2 | Z3
  <Z, E, Z2, A, Z3>(
    self: Take<E, A>,
    options: {
      readonly onEnd: () => Z
      readonly onFailure: (cause: Cause<E>) => Z2
      readonly onSuccess: (chunk: Chunk<A>) => Z3
    }
  ): Z | Z2 | Z3
} = internal.match

/**
 * Effectful version of `Take.fold`.
 *
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield an effect.
 *
 * @since 2.0.0
 * @category destructors
 */
export const matchEffect: {
  <R, E2, Z, R2, E, Z2, A, R3, E3, Z3>(
    options: {
      readonly onEnd: () => Effect<R, E2, Z>
      readonly onFailure: (cause: Cause<E>) => Effect<R2, E2, Z2>
      readonly onSuccess: (chunk: Chunk<A>) => Effect<R3, E3, Z3>
    }
  ): (self: Take<E, A>) => Effect<R | R2 | R3, E2 | E | E3, Z | Z2 | Z3>
  <R, E2, Z, R2, E, Z2, A, R3, E3, Z3>(
    self: Take<E, A>,
    options: {
      readonly onEnd: () => Effect<R, E2, Z>
      readonly onFailure: (cause: Cause<E>) => Effect<R2, E2, Z2>
      readonly onSuccess: (chunk: Chunk<A>) => Effect<R3, E3, Z3>
    }
  ): Effect<R | R2 | R3, E2 | E | E3, Z | Z2 | Z3>
} = internal.matchEffect

/**
 * Creates a `Take` with a single value chunk.
 *
 * @since 2.0.0
 * @category constructors
 */
export const of: <A>(value: A) => Take<never, A> = internal.of

/**
 * Returns an effect that effectfully "peeks" at the success of this take.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tap: {
  <A, R, E2, _>(
    f: (chunk: Chunk<A>) => Effect<R, E2, _>
  ): <E>(self: Take<E, A>) => Effect<R, E2 | E, void>
  <E, A, R, E2, _>(
    self: Take<E, A>,
    f: (chunk: Chunk<A>) => Effect<R, E2, _>
  ): Effect<R, E | E2, void>
} = internal.tap
