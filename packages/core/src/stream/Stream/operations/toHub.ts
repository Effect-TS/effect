/**
 * Converts the stream to a scoped hub of chunks. After the scope is closed,
 * the hub will never again produce values and should be discarded.
 *
 * @tsplus static effect/core/stream/Stream.Aspects toHub
 * @tsplus pipeable effect/core/stream/Stream toHub
 * @category destructors
 * @since 1.0.0
 */
export function toHub(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R | Scope, never, Hub<Take<E, A>>> =>
    Effect.acquireRelease(
      Hub.bounded<Take<E, A>>(capacity),
      (hub) => hub.shutdown
    ).tap((hub) => self.runIntoHubScoped(hub).forkScoped)
}
