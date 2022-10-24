import { SucceedNow } from "@effect/core/stream/Channel/definition/primitives"

/**
 * @tsplus static effect/core/stream/Channel.Ops succeed
 * @category constructors
 * @since 1.0.0
 */
export function succeed<OutDone>(
  result: OutDone
): Channel<never, unknown, unknown, unknown, never, never, OutDone> {
  return new SucceedNow(result)
}
