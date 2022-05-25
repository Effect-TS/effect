import { Succeed } from "@effect/core/stream/Channel/definition/primitives"

/**
 * @tsplus static ets/Channel/Ops succeed
 */
export function succeed<OutDone>(
  effect: LazyArg<OutDone>
): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Succeed(effect)
}
