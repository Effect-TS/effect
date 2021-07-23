// ets_tracing: off

import * as C from "../Cause"
import * as E from "../Either/core"
import { pipe } from "../Function"
import * as O from "../Option/core"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Recovers from some or all of the error cases.
 *
 * @ets_data_first catchSome_
 */
export function catchSome<R, E, A, R2, E2, A2>(
  f: (e: E) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
) {
  return (fa: Effect<R, E, A>) => catchSome_(fa, f, __trace)
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  f: (e: E) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
) {
  return foldCauseM_(
    fa,
    (cause): Effect<R2, E | E2, A2> =>
      pipe(
        cause,
        C.failureOrCause,
        E.fold(
          (x) =>
            pipe(
              x,
              f,
              O.getOrElse(() => halt(cause))
            ),
          halt
        )
      ),
    succeed,
    __trace
  )
}
