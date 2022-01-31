// ets_tracing: off

import { pipe } from "../Function/index.js"
import * as O from "../Option/index.js"
import * as catchAll from "./catchAll.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @ets_data_first orElseOptional_
 */
export function orElseOptional<R2, E2, A2>(
  that: () => Effect<R2, O.Option<E2>, A2>,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, O.Option<E>, A>) =>
    orElseOptional_(self, that, __trace)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional_<R, E, A, R2, E2, A2>(
  self: Effect<R, O.Option<E>, A>,
  that: () => Effect<R2, O.Option<E2>, A2>,
  __trace?: string
): Effect<R & R2, O.Option<E | E2>, A | A2> {
  return pipe(
    self,
    catchAll.catchAll<R2, O.Option<E | E2>, O.Option<E | E2>, A2>(
      O.fold(that, (x) => pipe(x, O.some, fail)),
      __trace
    )
  )
}
