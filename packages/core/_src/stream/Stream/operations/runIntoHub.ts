/**
 * Publishes elements of this stream to a hub. Stream failure and ending will
 * also be signalled.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runIntoHub
 * @tsplus pipeable effect/core/stream/Stream runIntoHub
 */
export function runIntoHub<E1, A>(hub: Hub<Take<E1, A>>) {
  return <R, E extends E1>(self: Stream<R, E, A>): Effect<R, E | E1, void> =>
    self.runIntoQueue(
      hub
    )
}
