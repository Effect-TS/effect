// ets_tracing: off

import type { Exit, Failure } from "../definition"

/**
 * Determines if the `Exit` result is a success.
 */
export function isFailure<E, A>(self: Exit<E, A>): self is Failure<E> {
  return self._tag === "Failure"
}
