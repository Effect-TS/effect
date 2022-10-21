/**
 * Concatenates all of the streams in the chunk to one stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops concatAll
 */
export function concatAll<R, E, A>(
  streams: Chunk<Stream<R, E, A>>
): Stream<R, E, A> {
  return streams.reduce(Stream.empty as Stream<R, E, A>, (acc, a) => acc + a)
}
