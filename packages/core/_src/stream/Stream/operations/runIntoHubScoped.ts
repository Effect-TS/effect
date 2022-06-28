/**
 * Like `Stream.runIntoHub`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runIntoHubScoped
 * @tsplus pipeable effect/core/stream/Stream runIntoHubScoped
 */
export function runIntoHubScoped<E1, A>(
  hub: LazyArg<Hub<Take<E1, A>>>,
  __tsplusTrace?: string
) {
  return <R, E extends E1>(self: Stream<R, E, A>): Effect<R | Scope, E | E1, void> => self.runIntoQueueScoped(hub)
}
