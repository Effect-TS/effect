/**
 * Flattens `Exit` values. `Exit.Failure` values translate to stream
 * failures while `Exit.Success` values translate to stream elements.
 *
 * @tsplus getter effect/core/stream/Stream flattenExit
 */
export function flattenExit<R, E, E2, A>(
  self: Stream<R, E, Exit<E2, A>>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  return self.mapEffect((exit) => Effect.done(exit))
}
