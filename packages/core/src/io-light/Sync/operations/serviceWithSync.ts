import type { Has, Tag } from "../../../data/Has"
import { Sync } from "../definition"

/**
 * Access a service with the required service entry.
 *
 * @tsplus static ets/SyncOps serviceWithSync
 */
export function serviceWithSync<T>(s: Tag<T>) {
  return <R, E, B>(f: (a: T) => Sync<R, E, B>): Sync<R & Has<T>, E, B> =>
    Sync.environmentWithSync((r: Has<T>) => f(r[s.key as any]))
}
