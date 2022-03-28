import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { XHub } from "../../../io/Hub"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Publishes elements of this stream to a hub. Stream failure and ending will
 * also be signalled.
 *
 * @tsplus fluent ets/Stream runIntoHub
 */
export function runIntoHub_<R, E extends E1, A, R1, E1>(
  self: Stream<R, E, A>,
  hub: LazyArg<XHub<R1, never, never, unknown, Take<E1, A>, unknown>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, void> {
  return self.runIntoQueue(hub().toQueue())
}

/**
 * Publishes elements of this stream to a hub. Stream failure and ending will
 * also be signalled.
 */
export const runIntoHub = Pipeable(runIntoHub_)
