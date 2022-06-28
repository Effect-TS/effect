/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream
 * by failing with `None`.
 *
 * @tsplus getter effect/core/stream/Stream flattenTake
 */
export function flattenTake<R, E, E2, A>(
  self: Stream<R, E, Take<E2, A>>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  return (self
    .map((take) => take.exit as Exit<Maybe<E | E2>, A>)
    .flattenExitMaybe as Stream<R, E | E2, Chunk<A>>)
    .unchunks
}
