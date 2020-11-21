import { traceAs, traceAsBind } from "../Tracing"
import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Like chain but ignores the input
 *
 * @module Effect
 * @named andThen
 * @trace bind
 */
export function andThen<R1, E1, A1>(fb: Effect<R1, E1, A1>) {
  return <R, E, A>(fa: Effect<R, E, A>) =>
    traceAsBind(
      andThen_,
      // @ts-expect-error
      this
    )(fa, fb)
}

/**
 * Like chain but ignores the input
 *
 * @module Effect
 * @named andThen_
 * @trace bind
 */
export function andThen_<R, E, A, R1, E1, A1>(
  fa: Effect<R, E, A>,
  fb: Effect<R1, E1, A1>
) {
  return chain_(
    fa,
    traceAs(
      () => fb,
      // @ts-expect-error
      this
    )
  )
}
