import { identity } from "../Function"
import type { Option } from "../Option"
import { fold } from "../Option"
import type { Effect } from "./effect"
import { mapError_ } from "./mapError"

/**
 * Unwraps the optional error, defaulting to the provided value.
 */
export function flattenErrorOption<E2>(def: () => E2) {
  return <R, E, A>(self: Effect<R, Option<E>, A>): Effect<R, E | E2, A> =>
    flattenErrorOption_(self, def)
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 */
export function flattenErrorOption_<R, E, A, E2>(
  self: Effect<R, Option<E>, A>,
  def: () => E2
): Effect<R, E | E2, A> {
  return mapError_(self, fold(def, identity))
}
