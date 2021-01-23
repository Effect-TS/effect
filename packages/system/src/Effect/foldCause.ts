import type { Cause } from "../Cause/cause"
import { foldCauseM_, succeed } from "./core"
import type { Effect, RIO } from "./effect"

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause<E, A, A2, A3>(
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3
) {
  return <R>(value: Effect<R, E, A>): RIO<R, A2 | A3> =>
    foldCauseM_(
      value,
      (c) => succeed(failure(c)),
      (x) => succeed(success(x))
    )
}
