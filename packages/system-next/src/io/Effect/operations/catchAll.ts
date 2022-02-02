import { Effect } from "../definition"

/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/Effect catchAll
 */
export function catchAll_<R2, E2, A2, R, E, A>(
  self: Effect<R2, E2, A2>,
  f: (e: E2) => Effect<R, E, A>,
  __etsTrace?: string
) {
  return self.foldEffect(f, Effect.succeedNow)
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<R, E, E2, A>(
  f: (e: E2) => Effect<R, E, A>,
  __etsTrace?: string
) {
  return <R2, A2>(self: Effect<R2, E2, A2>) => self.catchAll(f)
}
