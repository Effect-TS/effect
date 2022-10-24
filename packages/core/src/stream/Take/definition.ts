import type { Equal } from "@fp-ts/data/Equal"

/**
 * @category symbol
 * @since 1.0.0
 */
export const TakeSym = Symbol.for("@effect/core/stream/Take")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TakeSym = typeof TakeSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _E = Symbol.for("@effect/core/stream/Take/E")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _E = typeof _E

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/stream/Take/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * A `Take<E, A>` represents a single `take` from a queue modeling a stream of
 * values. A `Take` may be a failure cause `Cause<E>`, an chunk value `A` or an
 * end-of-stream marker.
 *
 * @tsplus type effect/core/stream/Take
 * @category model
 * @since 1.0.0
 */
export interface Take<E, A> extends Equal {
  readonly [TakeSym]: TakeSym
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stream/Take.Ops
 * @category model
 * @since 1.0.0
 */
export interface TakeOps {
  $: TakeAspects
}
export const Take: TakeOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stream/Take.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TakeAspects {}
