/**
 * Accesses the specified service in the environment of the stream.
 *
 * @tsplus static ets/Stream/Ops service
 */
export function service<T>(
  service: Service<T>,
  __tsplusTrace?: string
): Stream<Has<T>, never, T> {
  return Stream.serviceWith(service)(identity);
}
