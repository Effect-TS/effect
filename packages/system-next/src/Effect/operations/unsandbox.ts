import type { Cause } from "../../Cause"
import { flatten } from "../../Cause"
import type { Effect } from "../definition"
import { mapErrorCause_ } from "./mapErrorCause"

/**
 * The inverse operation `sandbox(effect)`
 *
 * Terminates with exceptions on the `Left` side of the `Either` error, if it
 * exists. Otherwise extracts the contained `Effect< R, E, A>`
 */
export function unsandbox<R, E, A>(fa: Effect<R, Cause<E>, A>, __trace?: string) {
  return mapErrorCause_(fa, flatten, __trace)
}
