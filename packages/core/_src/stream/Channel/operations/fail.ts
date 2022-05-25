import { Fail } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Halt a channel with the specified error.
 *
 * @tsplus static ets/Channel/Ops fail
 */
export function fail<E>(
  e: LazyArg<E>
): Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Fail(() => Cause.fail(e()))
}
