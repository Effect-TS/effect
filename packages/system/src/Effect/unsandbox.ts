import type { Cause } from "../Cause"
import { flatten } from "../Cause"
import type { Effect } from "./effect"
import { mapErrorCause_ } from "./mapErrorCause"

/**
 * The inverse operation `sandbox(effect)`
 *
 * Terminates with exceptions on the `Left` side of the `Either` error, if it
 * exists. Otherwise extracts the contained `Effect<S, R, E, A>`
 */
export function unsandbox<S, R, E, A>(fa: Effect<S, R, Cause<E>, A>) {
  return mapErrorCause_(fa, flatten)
}
