import type { Failure } from "@effect/core/io/Exit/definition"

/**
 * Determines if the `Exit` result is a success.
 *
 * @tsplus fluent ets/Exit isFailure
 */
export function isFailure<E, A>(self: Exit<E, A>): self is Failure<E> {
  return self._tag === "Failure"
}
