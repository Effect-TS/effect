/**
 * Access a service with the required service entry.
 *
 * @tsplus static ets/Sync/Ops service
 */
export function service<T>(tag: Tag<T>): Sync<Has<T>, never, T> {
  return Sync.serviceWithSync(tag)((a) => Sync.succeed(a));
}
