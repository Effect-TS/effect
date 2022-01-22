import type { Cause } from "../../Cause"
import * as O from "../../Option"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @ets fluent ets/Effect catchSomeCause
 */
export function catchSomeCause_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (_: Cause<E>) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
): Effect<R & R2, E | E2, A | A2> {
  return foldCauseEffect_(
    self,
    (c): Effect<R2, E | E2, A2> =>
      O.fold_(
        f(c),
        () => failCause(c),
        (a) => a
      ),
    succeedNow,
    __trace
  )
}

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @ets_data_first catchSomeCause_
 */
export function catchSomeCause<R2, E, E2, A2>(
  f: (_: Cause<E>) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    catchSomeCause_(self, f, __trace)
}
