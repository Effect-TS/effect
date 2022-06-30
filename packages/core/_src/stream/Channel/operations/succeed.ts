import { Succeed } from "@effect/core/stream/Channel/definition/primitives"

/**
 * @tsplus static effect/core/stream/Channel.Ops succeed
 */
export function succeed<OutDone>(
  effect: LazyArg<OutDone>
): Channel<never, unknown, unknown, unknown, never, never, OutDone> {
  return new Succeed(effect)
}
