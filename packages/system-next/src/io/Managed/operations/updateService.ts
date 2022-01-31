import type { Has, Tag } from "../../../data/Has"
import { Managed } from "../definition"

/**
 * Updates a service at the specified key in the environment of this effect.
 *
 * @tsplus fluent ets/Managed updateService
 */
export function updateService_<R, E, A, T>(
  self: Managed<R & Has<T>, E, A>,
  _: Tag<T>,
  f: (_: T) => T,
  __etsTrace?: string
): Managed<R & Has<T>, E, A> {
  // @ts-expect-error
  return Managed.serviceWithManaged(_)((s) =>
    self.provideServiceManaged(_)(Managed.succeedNow(f(s)))
  )
}

/**
 * Updates a service at the specified key in the environment of this effect.
 *
 * @ets_data_first updateService_
 */
export function updateService<T>(_: Tag<T>, f: (_: T) => T, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R & Has<T>, E, A>): Managed<R & Has<T>, E, A> =>
    updateService_(self, _, f)
}
