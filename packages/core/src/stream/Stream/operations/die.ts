import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Returns a stream that dies with the specified defect.
 *
 * @tsplus static ets/StreamOps die
 */
export function die(
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): Stream<unknown, never, never> {
  return Stream.fromEffect(Effect.die(defect))
}
