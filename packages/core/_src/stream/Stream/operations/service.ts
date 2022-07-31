/**
 * Accesses the specified service in the environment of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops service
 */
export function service<T>(tag: Tag<T>): Stream<T, never, T> {
  return Stream.serviceWith(tag, identity)
}
