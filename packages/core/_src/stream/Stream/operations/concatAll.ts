/**
 * Concatenates all of the streams in the chunk to one stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops concatAll
 */
export function concatAll<R, E, A>(
  streams: LazyArg<Chunk<Stream<R, E, A>>>
): Stream<R, E, A> {
  return Stream.suspend(
    streams().reduce(Stream.empty as Stream<R, E, A>, (acc, a) => acc + a)
  )
}
