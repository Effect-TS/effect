/**
 * Converts the stream to a scoped hub of chunks. After the scope is closed,
 * the hub will never again produce values and should be discarded.
 *
 * @tsplus fluent ets/Stream toHub
 */
export function toHub_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number,
  __tsplusTrace?: string
): Effect<R & HasScope, never, Hub<Take<E, A>>> {
  return Effect.acquireRelease(
    Hub.bounded<Take<E, A>>(capacity),
    (hub) => hub.shutdown
  ).tap((hub) => self.runIntoHubScoped(hub).fork());
}

/**
 * Converts the stream to a scoped hub of chunks. After the scope is closed,
 * the hub will never again produce values and should be discarded.
 *
 * @tsplus static ets/Stream/Aspects toHub
 */
export const toHub = Pipeable(toHub_);
