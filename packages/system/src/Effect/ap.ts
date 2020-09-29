import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Applicative's ap
 */
export function ap<R2, E2, A>(
  fa: Effect<R2, E2, A>
): <R, E, B>(fab: Effect<R, E, (a: A) => B>) => Effect<R & R2, E2 | E, B> {
  return (fab) => chain_(fab, (ab) => map_(fa, ab))
}
