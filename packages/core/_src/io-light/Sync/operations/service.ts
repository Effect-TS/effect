/**
 * Access a service with the required service entry.
 *
 * @tsplus static ets/Sync/Ops service
 */
export function service<T>(service: Service<T>): Sync<Has<T>, never, T> {
  return Sync.serviceWithSync(service)((a) => Sync.succeed(a));
}
