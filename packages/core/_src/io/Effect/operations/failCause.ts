import { IFailure } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * @tsplus static effect/core/io/Effect.Ops failCause
 */
export function failCause<E>(cause: Cause<E>): Effect<never, E, never> {
  return new IFailure(cause)
}
