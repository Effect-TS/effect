import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../definition"

/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/Effect updateService
 */
export function updateService_<R, E, A, T>(
  self: Effect<R & Has<T>, E, A>,
  _: Tag<T>,
  f: (_: T) => T,
  __etsTrace?: string
): Effect<R & Has<T>, E, A> {
  return Effect.serviceWithEffect(_)((t) =>
    self.provideServiceEffect(
      _,
      Effect.succeed(() => f(t))
    )
  )
}

/**
 * Updates the service with the required service entry.
 *
 * @ets_data_first updateService_
 */
export function updateService<T>(_: Tag<T>, f: (_: T) => T, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R & Has<T>, E, A>): Effect<R & Has<T>, E, A> =>
    updateService_(self, _, f)
}
