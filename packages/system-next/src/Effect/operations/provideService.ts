import type { Effect } from "../../Effect/definition"
import { succeed } from "../../Effect/operations/succeed"
import type { Has, Tag } from "../../Has"
import { provideServiceEffect } from "./provideServiceEffect"

/**
 * Provides the service with the required service entry.
 *
 * @ets fluent ets/Effect provideService
 */
export function provideService_<R, E, A, T>(
  effect: Effect<R & Has<T>, E, A>,
  _: Tag<T>,
  service: T,
  __trace?: string
): Effect<R, E, A> {
  return provideServiceEffect(_)(
    succeed(() => service),
    __trace
  )(effect)
}

/**
 * Provides the service with the required service entry.
 */
export function provideService<T>(_: Tag<T>) {
  return (service: T, __trace?: string) =>
    <R, E, A>(effect: Effect<R & Has<T>, E, A>): Effect<R, E, A> =>
      provideServiceEffect(_)(
        succeed(() => service),
        __trace
      )(effect)
}
