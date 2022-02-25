import type { Option } from "../../../data/Option"
import type { Cause } from "../../Cause"
import { Effect } from "../definition"

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @tsplus fluent ets/Effect catchSomeCause
 */
export function catchSomeCause_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (_: Cause<E>) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A | A2> {
  return self.foldCauseEffect(
    (c): Effect<R2, E | E2, A2> =>
      f(c).fold(
        () => Effect.failCauseNow(c),
        (a) => a
      ),
    Effect.succeedNow
  )
}

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @ets_data_first catchSomeCause_
 */
export function catchSomeCause<R2, E, E2, A2>(
  f: (_: Cause<E>) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    self.catchSomeCause(f)
}
