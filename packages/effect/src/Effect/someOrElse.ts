import { pipe } from "../Function"
import * as O from "../Option"
import type { Effect } from "./effect"
import { map } from "./map"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 */
export function someOrElse<B>(orElse: () => B) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) =>
    pipe(self, map(O.getOrElse(orElse)))
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 */
export function someOrElse_<R, E, A, B>(
  self: Effect<R, E, O.Option<A>>,
  orElse: () => B
): Effect<R, E, A | B> {
  return pipe(self, map(O.getOrElse(orElse)))
}
