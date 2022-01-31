import * as E from "../../../data/Either"
import * as O from "../../../data/Option"
import * as Cause from "../../Cause"
import { Effect } from "../definition"

/**
 * Recovers from some or all of the error cases.
 *
 * @ets fluent ets/Effect catchSome
 */
export function catchSome_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (e: E) => O.Option<Effect<R2, E2, A2>>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A | A2> {
  return self.foldCauseEffect(
    (cause): Effect<R2, E | E2, A2> =>
      E.fold_(
        Cause.failureOrCause(cause),
        (x) => O.getOrElse_(f(x), () => Effect.failCauseNow(cause)),
        Effect.failCauseNow
      ),
    Effect.succeedNow
  )
}

/**
 * Recovers from some or all of the error cases.
 *
 * @ets_data_first catchSome_
 */
export function catchSome<R, E, A, R2, E2, A2>(
  f: (e: E) => O.Option<Effect<R2, E2, A2>>,
  __etsTrace?: string
) {
  return (self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> => catchSome_(self, f)
}
