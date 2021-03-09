import type { Effect } from "./effect"
import { tapBoth_ } from "./tapBoth_"

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 */
export function tapBoth<E, A, R2, E2, R3, E3, X, Y>(
  f: (e: E) => Effect<R2, E2, X>,
  g: (a: A) => Effect<R3, E3, Y>
) {
  return <R>(self: Effect<R, E, A>) => tapBoth_(self, f, g)
}
