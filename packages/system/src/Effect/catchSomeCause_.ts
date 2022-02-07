// ets_tracing: off

import type { Cause } from "../Cause/cause.js"
import * as O from "../Option/index.js"
import { foldCauseM_, halt, succeed } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Recovers from some or all of the error cases with provided cause.
 */
export function catchSomeCause_<R2, E2, A2, R, E, A>(
  effect: Effect<R2, E2, A2>,
  f: (_: Cause<E2>) => O.Option<Effect<R, E, A>>,
  __trace?: string
) {
  return foldCauseM_(
    effect,
    (c): Effect<R, E | E2, A> =>
      O.fold_(
        f(c),
        () => halt(c),
        (a) => a
      ),
    succeed,
    __trace
  )
}

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @ets_data_first catchSomeCause_
 */
export function catchSomeCause<R, E, E2, A>(
  f: (_: Cause<E2>) => O.Option<Effect<R, E, A>>,
  __trace?: string
) {
  return <R2, A2>(effect: Effect<R2, E2, A2>) => catchSomeCause_(effect, f, __trace)
}
