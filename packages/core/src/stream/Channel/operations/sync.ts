import { Succeed } from "@effect/core/stream/Channel/definition/primitives"

/**
 * @tsplus static effect/core/stream/Channel.Ops sync
 * @category constructors
 * @since 1.0.0
 */
export function sync<OutDone>(
  effect: LazyArg<OutDone>
): Channel<never, unknown, unknown, unknown, never, never, OutDone> {
  return new Succeed(effect)
}
