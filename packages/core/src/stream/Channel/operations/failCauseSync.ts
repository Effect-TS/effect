import { Fail } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Halt a channel with the specified cause.
 *
 * @tsplus static effect/core/stream/Channel.Ops failCauseSync
 */
export function failCauseSync<E>(
  cause: LazyArg<Cause<E>>
): Channel<never, unknown, unknown, unknown, E, never, never> {
  return new Fail(cause)
}
