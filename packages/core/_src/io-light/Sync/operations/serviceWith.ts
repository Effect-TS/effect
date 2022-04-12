/**
 * Access a service with the required service entry.
 *
 * @tsplus static ets/Sync/Ops serviceWith
 */
export function serviceWith<T>(tag: Tag<T>) {
  return <B>(f: (resource: T) => B): Sync<Has<T>, never, B> => Sync.serviceWithSync(tag)((r) => Sync.succeed(f(r)));
}
