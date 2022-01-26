import * as E from "../../../data/Either"
import { failureOrCause } from "../../Cause"
import { Effect } from "../definition"

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @ets fluent ets/Effect tapError
 */
export function tapError_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A> {
  return self.foldCauseEffect(
    (cause) =>
      E.fold_(
        failureOrCause(cause),
        (e) => f(e).zipRight(Effect.failCauseNow(cause)),
        () => Effect.failCauseNow(cause)
      ),
    Effect.succeedNow
  )
}

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @ets_data_first tapError_
 */
export function tapError<E, R2, E2, X>(
  f: (e: E) => Effect<R2, E2, X>,
  __etsTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> => tapError_(self, f)
}
