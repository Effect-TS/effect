// ets_tracing: off

import type { Cause } from "../Cause/index.js"
import { flatten } from "../Cause/index.js"
import type { Effect } from "./effect.js"
import { mapErrorCause_ } from "./mapErrorCause.js"

/**
 * The inverse operation `sandbox(effect)`
 *
 * Terminates with exceptions on the `Left` side of the `Either` error, if it
 * exists. Otherwise extracts the contained `Effect< R, E, A>`
 */
export function unsandbox<R, E, A>(fa: Effect<R, Cause<E>, A>, __trace?: string) {
  return mapErrorCause_(fa, flatten, __trace)
}
