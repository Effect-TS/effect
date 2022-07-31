export const EffectURI = "Effect"
export type EffectURI = typeof EffectURI

export const _U = Symbol.for("@effect/core/io/Effect/U")
export type _U = typeof _U

export const _R = Symbol.for("@effect/core/io/Effect/R")
export type _R = typeof _R

export const _E = Symbol.for("@effect/core/io/Effect/E")
export type _E = typeof _E

export const _A = Symbol.for("@effect/core/io/Effect/A")
export type _A = typeof _A

export const _S1 = Symbol.for("@effect/core/io/Effect/S1")
export type _S1 = typeof _S1

export const _S2 = Symbol.for("@effect/core/io/Effect/S2")
export type _S2 = typeof _S2

export const _W = Symbol.for("@effect/core/io/Effect/W")
export type _W = typeof _W

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
 */
export interface Effect<R, E, A> {
  readonly [_U]: EffectURI
  readonly [_R]: () => R
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @tsplus unify effect/core/io/Effect
 */
export function unifyEffect<X extends Effect<any, any, any>>(
  self: X
): Effect<
  [X] extends [{ [_R]: () => infer R }] ? R : never,
  [X] extends [{ [_E]: () => infer E }] ? E : never,
  [X] extends [{ [_A]: () => infer A }] ? A : never
> {
  return self
}

/**
 * @tsplus type effect/core/io/Effect.Ops
 */
export interface EffectOps {
  readonly $: EffectAspects
  readonly Error: {
    new<E, A>(exit: Exit<E, A>, __taPlusTrace?: string): Effect.Error<E, A>
  }
}
export const Effect: EffectOps = {
  $: {},
  Error: class EffectError<E, A> extends Error {
    readonly _tag = "EffectError"

    constructor(readonly exit: Exit<E, A>, readonly trace?: string) {
      super()
    }
  }
}

/**
 * @tsplus type effect/core/io/Effect.Aspects
 */
export interface EffectAspects {}

export namespace Effect {
  export type UIO<A> = Effect<never, never, A>
  export type IO<E, A> = Effect<never, E, A>
  export type RIO<R, A> = Effect<R, never, A>
  export interface Error<E, A> {
    readonly _tag: "EffectError"
    readonly exit: Exit<E, A>
    readonly trace?: string
  }
  export type Success<T extends Effect<any, any, any>> = [T] extends
    [Effect<infer R, infer E, infer A>] ? A : never
}

export abstract class Base<R, E, A> implements Effect<R, E, A> {
  readonly [_U]!: EffectURI
  readonly [_R]!: () => R
  readonly [_E]!: () => E
  readonly [_A]!: () => A
  abstract unsafeLog(): string
}

export type Canceler<R> = Effect<R, never, void>
