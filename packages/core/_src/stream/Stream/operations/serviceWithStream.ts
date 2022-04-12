/**
 * Accesses the specified service in the environment of the stream in the
 * context of a stream.
 *
 * @tsplus static ets/Stream/Ops serviceWithStream
 */
export function serviceWithStream<T>(tag: Tag<T>) {
  return <R, E, A>(f: (resource: T) => Stream<R, E, A>, __tsplusTrace?: string): Stream<R & Has<T>, E, A> =>
    Stream.service(tag).flatMap(f);
}
