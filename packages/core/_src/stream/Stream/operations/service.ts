/**
 * Accesses the specified service in the environment of the stream.
 *
 * @tsplus static ets/Stream/Ops service
 */
export function service<T>(tag: Tag<T>, __tsplusTrace?: string): Stream<Has<T>, never, T> {
  return Stream.serviceWith(tag)(identity)
}
