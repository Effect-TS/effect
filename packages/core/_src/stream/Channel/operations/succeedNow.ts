import { SucceedNow } from "@effect/core/stream/Channel/definition/primitives"

/**
 * @tsplus static effect/core/stream/Channel.Ops succeedNow
 */
export function succeedNow<OutDone>(
  result: OutDone
): Channel<never, unknown, unknown, unknown, never, never, OutDone> {
  return new SucceedNow(result)
}
