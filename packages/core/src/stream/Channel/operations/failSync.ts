import { Fail } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Halt a channel with the specified error.
 *
 * @tsplus static effect/core/stream/Channel.Ops failSync
 */
export function failSync<E>(
  e: LazyArg<E>
): Channel<never, unknown, unknown, unknown, E, never, never> {
  return new Fail(() => Cause.fail(e()))
}
