// tracing: off

import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Applicative's ap
 *
 * @trace call
 */
export function ap<R2, E2, A>(
  fa: Effect<R2, E2, A>
): <R, E, B>(fab: Effect<R, E, (a: A) => B>) => Effect<R & R2, E2 | E, B> {
  return (fab) => ap_(fab, fa)
}

/**
 * Applicative's ap
 */
export function ap_<R, E, B, R2, E2, A>(
  fab: Effect<R, E, (a: A) => B>,
  fa: Effect<R2, E2, A>
): Effect<R & R2, E2 | E, B> {
  return chain_(fab, (ab) => map_(fa, ab))
}
