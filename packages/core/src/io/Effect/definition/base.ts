export const EffectURI = Symbol.for("@effect/core/io/Effect/Effect")
export type EffectURI = typeof EffectURI

/**
 * An`Effect<R, E, A>` value is an immutable value that lazily describes a
 * workflow or job. The workflow requires some environment `R`, and may fail
 * with an error of type `E`, or succeed with a value of type `A`.
 *
 * These lazy workflows, referred to as _effects_, can be informally thought of
 * as functions in the form:
 *
 * ```typescript
 * (environment: R) => Either<E, A>
 * ```
 *
 * Effects model resourceful interaction with the outside world, including
 * synchronous, asynchronous, concurrent, and parallel interaction.
 *
 * Effects use a fiber-based concurrency model, with built-in support for
 * scheduling, fine-grained interruption, structured concurrency, and high
 * scalability.
 *
 * To run an effect, you need a `Runtime`, which is capable of executing
 * effects.
 *
 * @tsplus type effect/core/io/Effect
 * @category model
 * @since 1.0.0
 */
export interface Effect<R, E, A> {
  readonly [EffectURI]: {
    _R: (_: never) => R
    _E: (_: never) => E
    _A: (_: never) => A
  }
}

/**
 * @tsplus unify effect/core/io/Effect
 */
export function unifyEffect<X extends Effect<any, any, any>>(
  self: X
): Effect<
  [X] extends [{ readonly [EffectURI]: { _R: (_: never) => infer R } }] ? R : never,
  [X] extends [{ readonly [EffectURI]: { _E: (_: never) => infer E } }] ? E : never,
  [X] extends [{ readonly [EffectURI]: { _A: (_: never) => infer A } }] ? A : never
> {
  return self
}

/**
 * @tsplus type effect/core/io/Effect.Ops
 * @category model
 * @since 1.0.0
 */
export interface EffectOps {
  readonly $: EffectAspects
  readonly Error: {
    new<E>(cause: Cause<E>): Effect.Error<E>
  }
}
export const Effect: EffectOps = {
  $: {},
  Error: class EffectError<E> extends Error {
    readonly _tag = "EffectError"

    constructor(readonly cause: Cause<E>) {
      super()
    }
  }
}

/**
 * @tsplus type effect/core/io/Effect.Aspects
 * @category model
 * @since 1.0.0
 */
export interface EffectAspects {}

export namespace Effect {
  export interface Error<E> {
    readonly _tag: "EffectError"
    readonly cause: Cause<E>
  }
  export type Success<T extends Effect<any, any, any>> = [T] extends
    [Effect<infer R, infer E, infer A>] ? A : never
}

/**
 * @category model
 * @since 1.0.0
 */
export type Canceler<R> = Effect<R, never, void>
