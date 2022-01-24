import * as E from "../../../data/Either"
import { failureOrCause } from "../../Cause"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"
import { zipRight_ } from "./zipRight"

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @ets fluent ets/Effect tapError
 */
export function tapError_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return foldCauseEffect_(
    self,
    (cause) =>
      E.fold_(
        failureOrCause(cause),
        (e) => zipRight_(f(e), failCause(cause)),
        () => failCause(cause)
      ),
    succeedNow,
    __trace
  )
}

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @ets_data_first tapError_
 */
export function tapError<E, R2, E2, X>(
  f: (e: E) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    tapError_(self, f, __trace)
}
