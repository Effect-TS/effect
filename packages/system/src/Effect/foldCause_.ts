import type { Cause } from "../Cause/cause"
import { foldCauseM_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export const foldCause_ = <S, R, E, A, A2, A3>(
  value: Effect<S, R, E, A>,
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3
): Effect<S, R, never, A2 | A3> =>
  foldCauseM_(
    value,
    (c) => succeed(failure(c)),
    (x) => succeed(success(x))
  )
