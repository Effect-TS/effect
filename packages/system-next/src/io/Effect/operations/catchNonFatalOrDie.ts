import { Effect } from "../definition"

/**
 * Recovers from all non-fatal defects.
 *
 * @tsplus fluent ets/Effect catchNonFatalOrDie
 */
export function catchNonFatalOrDie_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A | A2> {
  return self.foldEffect(
    (e) =>
      Effect.runtime().flatMap((runtime) =>
        runtime.runtimeConfig.value.fatal(e) ? Effect.dieNow(e) : f(e)
      ),
    Effect.succeedNow
  )
}

/**
 * Recovers from all non-fatal defects.
 */
export function catchNonFatalOrDie<E, R2, E2, A2>(
  f: (e: E) => Effect<R2, E2, A2>,
  __etsTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    catchNonFatalOrDie_(self, f)
}
