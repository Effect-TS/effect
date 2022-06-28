export const TakeSym = Symbol.for("@effect/core/stream/Take")
export type TakeSym = typeof TakeSym

export const _E = Symbol.for("@effect/core/stream/Take/E")
export type _E = typeof _E

export const _A = Symbol.for("@effect/core/stream/Take/A")
export type _A = typeof _A

/**
 * A `Take<E, A>` represents a single `take` from a queue modeling a stream of
 * values. A `Take` may be a failure cause `Cause<E>`, an chunk value `A` or an
 * end-of-stream marker.
 *
 * @tsplus type effect/core/stream/Take
 */
export interface Take<E, A> extends Equals {
  readonly [TakeSym]: TakeSym
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stream/Take.Ops
 */
export interface TakeOps {
  $: TakeAspects
}
export const Take: TakeOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stream/Take.Aspects
 */
export interface TakeAspects {}
