import { Fail } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Halt a channel with the specified cause.
 *
 * @tsplus static effect/core/stream/Channel.Ops failCause
 * @category constructors
 * @since 1.0.0
 */
export function failCause<E>(
  cause: Cause<E>
): Channel<never, unknown, unknown, unknown, E, never, never> {
  return new Fail(() => cause)
}
