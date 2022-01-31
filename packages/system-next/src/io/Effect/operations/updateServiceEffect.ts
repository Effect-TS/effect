import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../definition"

/**
 * Updates the service with the required service entry.
 *
 * @ets fluent ets/Effect updateServiceEffect
 */
export function updateServiceEffect_<R1, E1, A, R, E, T>(
  self: Effect<R1 & Has<T>, E1, A>,
  _: Tag<T>,
  f: (_: T) => Effect<R, E, T>,
  __etsTrace?: string
): Effect<R & R1 & Has<T>, E | E1, A> {
  return Effect.serviceWithEffect(_)((t) => self.provideServiceEffect(_, f(t)))
}

/**
 * Updates the service with the required service entry.
 */
export function updateServiceEffect<R, E, T>(
  _: Tag<T>,
  f: (_: T) => Effect<R, E, T>,
  __etsTrace?: string
) {
  return <R1, E1, A>(
    self: Effect<R1 & Has<T>, E1, A>
  ): Effect<R & R1 & Has<T>, E | E1, A> => updateServiceEffect_(self, _, f)
}
