import type { _A, _E } from "../../support/Symbols"

export const TakeSym = Symbol.for("@effect-ts/core/stream/Take")
export type TakeSym = typeof TakeSym

/**
 * A `Take<E, A>` represents a single `take` from a queue modeling a stream of
 * values. A `Take` may be a failure cause `Cause<E>`, an chunk value `A` or an
 * end-of-stream marker.
 *
 * @tsplus type ets/Take
 */
export interface Take<E, A> {
  readonly [TakeSym]: TakeSym
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @tsplus type ets/TakeOps
 */
export interface TakeOps {}
export const Take: TakeOps = {}
