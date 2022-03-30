import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { Hub } from "../../../io/Hub"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Publishes elements of this stream to a hub. Stream failure and ending will
 * also be signalled.
 *
 * @tsplus fluent ets/Stream runIntoHub
 */
export function runIntoHub_<R, E extends E1, A, E1>(
  self: Stream<R, E, A>,
  hub: LazyArg<Hub<Take<E1, A>>>,
  __tsplusTrace?: string
): Effect<R, E | E1, void> {
  return self.runIntoQueue(hub)
}

/**
 * Publishes elements of this stream to a hub. Stream failure and ending will
 * also be signalled.
 */
export const runIntoHub = Pipeable(runIntoHub_)
