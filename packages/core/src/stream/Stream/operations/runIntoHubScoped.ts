import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { Hub } from "../../../io/Hub"
import type { HasScope } from "../../../io/Scope"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Like `Stream.runIntoHub`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus fluent ets/Stream runIntoHubScoped
 */
export function runIntoHubScoped_<R, E extends E1, A, E1>(
  self: Stream<R, E, A>,
  hub: LazyArg<Hub<Take<E1, A>>>,
  __tsplusTrace?: string
): Effect<R & HasScope, E | E1, void> {
  return self.runIntoQueueScoped(hub)
}

/**
 * Like `Stream.runIntoHub`, but provides the result as a scoped effect to
 * allow for scope composition.
 */
export const runIntoHubScoped = Pipeable(runIntoHubScoped_)
