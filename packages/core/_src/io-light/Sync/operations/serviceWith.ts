/**
 * Access a service with the required service entry.
 *
 * @tsplus static ets/Sync/Ops serviceWith
 */
export function serviceWith<T>(service: Service<T>) {
  return <B>(f: (resource: T) => B): Sync<Has<T>, never, B> => Sync.serviceWithSync(service)((r) => Sync.succeed(f(r)));
}
