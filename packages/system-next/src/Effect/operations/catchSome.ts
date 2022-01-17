import * as Cause from "../../Cause"
import * as E from "../../Either"
import * as O from "../../Option"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  f: (e: E) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
): Effect<R & R2, E | E2, A | A2> {
  return foldCauseEffect_(
    fa,
    (cause): Effect<R2, E | E2, A2> =>
      E.fold_(
        Cause.failureOrCause(cause),
        (x) => O.getOrElse_(f(x), () => failCause(cause)),
        failCause
      ),
    succeedNow,
    __trace
  )
}

/**
 * Recovers from some or all of the error cases.
 *
 * @ets_data_first catchSome_
 */
export function catchSome<R, E, A, R2, E2, A2>(
  f: (e: E) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
) {
  return (fa: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    catchSome_(fa, f, __trace)
}
