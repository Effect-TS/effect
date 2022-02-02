import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../definition"

/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/Effect updateService
 */
export function updateService_<R, E, A, T>(
  self: Effect<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return (f: (_: T) => T, __etsTrace?: string): Effect<R & Has<T>, E, A> =>
    Effect.serviceWithEffect(tag)((t) =>
      self.provideServiceEffect(tag)(Effect.succeed(f(t)))
    ) as Effect<R & Has<T>, E, A>
}

/**
 * Updates the service with the required service entry.
 *
 * @ets_data_first updateService_
 */
export function updateService<T>(tag: Tag<T>, f: (_: T) => T, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R & Has<T>, E, A>): Effect<R & Has<T>, E, A> =>
    self.updateService(tag)(f)
}
