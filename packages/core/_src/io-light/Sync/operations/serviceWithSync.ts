/**
 * Access a service with the required service entry.
 *
 * @tsplus static ets/Sync/Ops serviceWithSync
 */
export function serviceWithSync<T>(service: Service<T>) {
  return <R, E, B>(f: (resource: T) => Sync<R, E, B>): Sync<R & Has<T>, E, B> =>
    Sync.environmentWithSync((r: Has<T>) => f(service.get(r)));
}
