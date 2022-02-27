import type { Has, Tag } from "../../../data/Has"
import type { Effect } from "../definition"

/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/Effect updateService
 */
export function updateService_<R, E, A, T>(self: Effect<R, E, A>, tag: Tag<T>) {
  return (f: (_: T) => T, __tsplusTrace?: string): Effect<R & Has<T>, E, A> =>
    self.provideSomeEnvironment((r) => ({ ...r, ...tag.has(f(tag.read(r))) }))
}

/**
 * Updates the service with the required service entry.
 *
 * @ets_data_first updateService_
 */
export function updateService<T>(tag: Tag<T>, f: (_: T) => T, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & Has<T>, E, A> =>
    self.updateService(tag)(f)
}
