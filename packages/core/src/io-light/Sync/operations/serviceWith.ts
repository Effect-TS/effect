import type { Has, Tag } from "../../../data/Has"
import { Sync } from "../definition"

/**
 * Access a service with the required service entry.
 *
 * @tsplus static ets/SyncOps serviceWith
 */
export function serviceWith<T>(s: Tag<T>) {
  return <B>(f: (a: T) => B): Sync<Has<T>, never, B> =>
    Sync.serviceWithSync(s)((a) => Sync.succeed(f(a)))
}
