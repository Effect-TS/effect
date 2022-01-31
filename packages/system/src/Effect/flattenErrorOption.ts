// ets_tracing: off

import { identity } from "../Function/index.js"
import type { Option } from "../Option/index.js"
import { fold } from "../Option/index.js"
import type { Effect } from "./effect.js"
import { mapError_ } from "./mapError.js"

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @ets_data_first flattenErrorOption_
 */
export function flattenErrorOption<E2>(def: () => E2, __trace?: string) {
  return <R, E, A>(self: Effect<R, Option<E>, A>): Effect<R, E | E2, A> =>
    flattenErrorOption_(self, def, __trace)
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 */
export function flattenErrorOption_<R, E, A, E2>(
  self: Effect<R, Option<E>, A>,
  def: () => E2,
  __trace?: string
): Effect<R, E | E2, A> {
  return mapError_(self, fold(def, identity), __trace)
}
