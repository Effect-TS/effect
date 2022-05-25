/**
 * Concatenates all of the streams in the chunk to one stream.
 *
 * @tsplus static ets/Stream/Ops concatAll
 */
export function concatAll<R, E, A>(
  streams: LazyArg<Chunk<Stream<R, E, A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.suspend(
    streams().reduce(Stream.empty as Stream<R, E, A>, (acc, a) => acc + a)
  )
}
