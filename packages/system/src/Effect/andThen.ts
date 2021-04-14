// tracing: off

import { chain_, provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Propagates the given environment to self.
 *
 * @dataFirst andThen_
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
