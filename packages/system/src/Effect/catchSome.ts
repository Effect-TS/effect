// ets_tracing: off

import * as C from "../Cause/index.js"
import * as E from "../Either/core.js"
import { pipe } from "../Function/index.js"
import * as O from "../Option/core.js"
import { foldCauseM_, halt, succeed } from "./core.js"
import type { Effect } from "./effect.js"

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
