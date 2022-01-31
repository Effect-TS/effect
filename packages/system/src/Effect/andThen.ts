// ets_tracing: off

import { chain_, provideAll_ } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Propagates the given environment to self.
 *
 * @ets_data_first andThen_
 */
export function andThen<A, E1, A1>(fb: Effect<A, E1, A1>, __trace?: string) {
  return <R, E>(fa: Effect<R, E, A>) => andThen_(fa, fb, __trace)
}

/**
 * Propagates the given environment to self.
 */
export function andThen_<R, E, A, E1, A1>(
  fa: Effect<R, E, A>,
  fb: Effect<A, E1, A1>,
  __trace?: string
) {
  return chain_(fa, (a) => provideAll_(fb, a), __trace)
}
