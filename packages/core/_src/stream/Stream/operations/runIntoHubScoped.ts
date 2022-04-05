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
  return self.runIntoQueueScoped(hub);
}

/**
 * Like `Stream.runIntoHub`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus static ets/Stream/Aspects runIntoHubScoped
 */
export const runIntoHubScoped = Pipeable(runIntoHubScoped_);
