/**
 * Access a service with the required service entry.
 *
 * @tsplus static ets/Sync/Ops serviceWithSync
 */
export function serviceWithSync<T>(tag: Tag<T>) {
  return <R, E, B>(f: (resource: T) => Sync<R, E, B>): Sync<R & Has<T>, E, B> =>
    Sync.environmentWithSync((env: Env<Has<T>>) => f(env.get(tag)));
}
