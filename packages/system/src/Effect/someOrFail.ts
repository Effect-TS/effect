import { pipe } from "../Function"
import * as O from "../Option"
import { chain, chain_, effectTotal, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail<E2>(orFail: () => E2) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) => someOrFail_(self, orFail)
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, A, E2>(
  self: Effect<R, E, O.Option<A>>,
  orFail: () => E2
): Effect<R, E | E2, A> {
  return pipe(self, chain(O.fold(() => chain_(effectTotal(orFail), fail), succeed)))
}
