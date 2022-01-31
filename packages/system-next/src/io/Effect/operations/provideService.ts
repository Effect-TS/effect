import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../definition"

/**
 * Provides the service with the required service entry.
 *
 * @ets fluent ets/Effect provideService
 */
export function provideService_<R, E, A, T>(
  self: Effect<R & Has<T>, E, A>,
  _: Tag<T>,
  service: T,
  __etsTrace?: string
): Effect<R, E, A> {
  return self.provideServiceEffect(
    _,
    Effect.succeed(() => service)
  ) as Effect<R, E, A>
}

/**
 * Provides the service with the required service entry.
 *
 * @ets_data_first provideService
 */
export function provideService<T>(_: Tag<T>) {
  return (service: T, __etsTrace?: string) =>
    <R, E, A>(self: Effect<R & Has<T>, E, A>): Effect<R, E, A> =>
      provideService_<R, E, A, T>(self, _, service)
}
