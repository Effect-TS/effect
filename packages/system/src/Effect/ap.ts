// ets_tracing: off

import { chain_ } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Applicative's ap
 */
export function ap<R2, E2, A>(
  fa: Effect<R2, E2, A>,
  __trace?: string
): <R, E, B>(fab: Effect<R, E, (a: A) => B>) => Effect<R & R2, E2 | E, B> {
  return (fab) => ap_(fab, fa, __trace)
}

/**
 * Applicative's ap
 */
export function ap_<R, E, B, R2, E2, A>(
  fab: Effect<R, E, (a: A) => B>,
  fa: Effect<R2, E2, A>,
  __trace?: string
): Effect<R & R2, E2 | E, B> {
  return chain_(fab, (ab) => map_(fa, ab), __trace)
}
