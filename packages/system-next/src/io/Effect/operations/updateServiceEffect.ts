import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../definition"

/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/Effect updateServiceEffect
 */
export function updateServiceEffect_<R1, E1, A, T>(
  self: Effect<R1 & Has<T>, E1, A>,
  tag: Tag<T>
) {
  return <R, E>(
    f: (_: T) => Effect<R, E, T>,
    __etsTrace?: string
  ): Effect<R & R1 & Has<T>, E | E1, A> =>
    Effect.serviceWithEffect(tag)((t) =>
      self.provideServiceEffect(tag)(f(t))
    ) as Effect<R & R1 & Has<T>, E | E1, A>
}

/**
 * Updates the service with the required service entry.
 */
export function updateServiceEffect<R, E, T>(tag: Tag<T>) {
  ;(f: (_: T) => Effect<R, E, T>, __etsTrace?: string) =>
    <R1, E1, A>(self: Effect<R1 & Has<T>, E1, A>): Effect<R & R1 & Has<T>, E | E1, A> =>
      self.updateServiceEffect(tag)(f)
}
