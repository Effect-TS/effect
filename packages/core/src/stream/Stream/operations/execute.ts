import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Creates a stream that executes the specified effect but emits no elements.
 *
 * @tsplus static ets/StreamOps execute
 */
export function execute<R, E, Z>(
  effect: LazyArg<Effect<R, E, Z>>,
  __tsplusTrace?: string
): Stream<R, E, never> {
  return Stream.fromEffect(effect).drain()
}
