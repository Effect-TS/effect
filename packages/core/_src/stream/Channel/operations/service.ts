/**
 * Accesses the specified service in the environment of the channel.
 *
 * @tsplus static ets/Channel/Ops service
 */
export function service<T>(
  service: Service<T>
): Channel<Has<T>, unknown, unknown, unknown, never, never, T> {
  return Channel.fromEffect(Effect.service(service));
}
