import { Fail } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Halt a channel with the specified cause.
 *
 * @tsplus static ets/Channel/Ops failCause
 */
export function failCause<E>(
  cause: LazyArg<Cause<E>>
): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Fail(cause)
}
