import type { Failure } from "@effect/core/io/Exit/definition"

/**
 * Determines if the `Exit` result is a success.
 *
 * @tsplus fluent effect/core/io/Exit isFailure
 * @category refinements
 * @since 1.0.0
 */
export function isFailure<E, A>(self: Exit<E, A>): self is Failure<E> {
  return self._tag === "Failure"
}
