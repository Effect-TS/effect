import * as O from "../Option"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 */
export function someOrElse<B>(orElse: () => B) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) => someOrElse_(self, orElse)
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 */
export function someOrElse_<R, E, A, B>(
  self: Effect<R, E, O.Option<A>>,
  orElse: () => B
): Effect<R, E, A | B> {
  return map_(self, O.getOrElse(orElse))
}
