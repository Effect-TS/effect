import type { LazyArg } from "../../../data/Function"
import type { RIO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Creates a one-element stream that never fails and executes the finalizer
 * when it ends.
 *
 * @tsplus static ets/StreamOps finalizer
 */
export function finalizer<R, Z>(
  finalizer: LazyArg<RIO<R, Z>>,
  __tsplusTrace?: string
): Stream<R, never, void> {
  return Stream.acquireReleaseWith(Effect.unit, finalizer)
}
