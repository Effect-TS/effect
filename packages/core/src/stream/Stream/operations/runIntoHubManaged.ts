import type { LazyArg } from "../../../data/Function"
import type { XHub } from "../../../io/Hub"
import type { Managed } from "../../../io/Managed"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Like `Stream.runIntoHub`, but provides the result as a `Managed` to
 * allow for scope composition.
 *
 * @tsplus fluent ets/Stream runIntoHubManaged
 */
export function runIntoHubManaged_<R, E extends E1, A, R1, E1>(
  self: Stream<R, E, A>,
  hub: LazyArg<XHub<R1, never, never, unknown, Take<E1, A>, unknown>>,
  __tsplusTrace?: string
): Managed<R & R1, E | E1, void> {
  return self.runIntoQueueManaged(hub().toQueue())
}

/**
 * Like `Stream.runIntoHub`, but provides the result as a `Managed` to
 * allow for scope composition.
 */
export const runIntoHubManaged = Pipeable(runIntoHubManaged_)
