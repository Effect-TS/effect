import type { Managed } from "../definition"
import { catchAll_ } from "./catchAll"
import { die } from "./die"
import { mapError_ } from "./mapError"

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 */
export function orDieWith_<R, E, A>(
  self: Managed<R, E, A>,
  f: (e: E) => unknown,
  __trace?: string
): Managed<R, never, A> {
  return catchAll_(mapError_(self, f), die, __trace)
}
