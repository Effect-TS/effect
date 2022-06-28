/**
 * Accesses the specified service in the environment of the stream in the
 * context of a stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops serviceWithStream
 */
export function serviceWithStream<T, R, E, A>(
  tag: Tag<T>,
  f: (resource: T) => Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R | T, E, A> {
  return Stream.service(tag).flatMap(f)
}
