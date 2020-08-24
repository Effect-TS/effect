import * as O from "../Option/core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<S, R, E, A>(fa: Effect<S, R, E, A>) {
  return map_(fa, O.some)
}
