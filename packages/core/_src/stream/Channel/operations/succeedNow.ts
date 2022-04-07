import { SucceedNow } from "@effect/core/stream/Channel/definition/primitives";

/**
 * @tsplus static ets/Channel/Ops succeedNow
 */
export function succeedNow<OutDone>(
  result: OutDone
): Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new SucceedNow(result);
}
