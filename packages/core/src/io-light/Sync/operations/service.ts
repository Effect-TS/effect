import type { Has, Tag } from "../../../data/Has"
import { Sync } from "../definition"

/**
 * Access a service with the required service entry.
 *
 * @tsplus static ets/SyncOps service
 */
export function service<T>(s: Tag<T>): Sync<Has<T>, never, T> {
  return Sync.serviceWithSync(s)((a) => Sync.succeed(a))
}
