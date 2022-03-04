import type { Has, Tag } from "../../../data/Has"
import type { STM } from "../definition"

/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/STM updateService
 */
export function updateService_<R, E, A, T>(self: STM<R, E, A>, tag: Tag<T>) {
  return (f: (_: T) => T): STM<R & Has<T>, E, A> =>
    self.provideSomeEnvironment((r) => ({ ...r, ...tag.has(f(tag.read(r))) }))
}

/**
 * Updates the service with the required service entry.
 *
 * @ets_data_first updateService_
 */
export function updateService<T>(tag: Tag<T>, f: (_: T) => T) {
  return <R, E, A>(self: STM<R, E, A>): STM<R & Has<T>, E, A> =>
    self.updateService(tag)(f)
}
