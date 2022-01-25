import type { Has, Tag } from "../../../data/Has"
import type { Effect } from "../definition"
import { provideServiceEffect } from "./provideServiceEffect"
import { succeed } from "./succeed"

/**
 * Provides the service with the required service entry.
 *
 * @ets fluent ets/Effect provideService
 */
export function provideService_<R, E, A, T>(
  effect: Effect<R & Has<T>, E, A>,
  _: Tag<T>,
  service: T,
  __etsTrace?: string
): Effect<R, E, A> {
  return provideServiceEffect(_)(
    succeed(() => service),
    __etsTrace
  )(effect)
}

/**
 * Provides the service with the required service entry.
 */
export function provideService<T>(_: Tag<T>) {
  return (service: T, __etsTrace?: string) =>
    <R, E, A>(effect: Effect<R & Has<T>, E, A>): Effect<R, E, A> =>
      provideServiceEffect(_)(
        succeed(() => service),
        __etsTrace
      )(effect)
}
