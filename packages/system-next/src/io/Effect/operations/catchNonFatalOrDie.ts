import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { die } from "./die"
import { foldEffect_ } from "./foldEffect"
import { runtime } from "./runtime"
import { succeedNow } from "./succeedNow"

/**
 * Recovers from all non-fatal defects.
 *
 * @ets fluent ets/Effect catchNonFatalOrDie
 */
export function catchNonFatalOrDie_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, A | A2> {
  return foldEffect_(
    self,
    (e) =>
      chain_(runtime(), (runtime) =>
        runtime.runtimeConfig.value.fatal(e) ? die(e) : f(e)
      ),
    succeedNow,
    __trace
  )
}

/**
 * Recovers from all non-fatal defects.
 */
export function catchNonFatalOrDie<E, R2, E2, A2>(
  f: (e: E) => Effect<R2, E2, A2>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    catchNonFatalOrDie_(self, f, __trace)
}
