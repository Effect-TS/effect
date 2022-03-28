import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * The stream that dies with an exception described by `msg`.
 *
 * @tsplus static ets/StreamOps dieMessage
 */
export function dieMessage(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, never> {
  return Stream.fromEffect(Effect.dieMessage(message))
}
