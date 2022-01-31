import type { Has, Tag } from "../../../data/Has"
import { Managed } from "../definition"

/**
 * Updates a service at the specified key in the environment of this effect.
 *
 * @ets fluent ets/Managed updateServiceManaged
 */
export function updateServiceManaged_<R, E, A, R1, E1, T>(
  self: Managed<R & Has<T>, E, A>,
  _: Tag<T>,
  f: (_: T) => Managed<R1, E1, T>,
  __etsTrace?: string
): Managed<R & R1 & Has<T>, E | E1, A> {
  // @ts-expect-error
  return Managed.serviceWithManaged(_)((s) => self.provideServiceManaged(_)(f(s)))
}

/**
 * Updates a service at the specified key in the environment of this effect.
 *
 * @ets_data_first updateServiceManaged_
 */
export function updateServiceManaged<R1, E1, T>(
  _: Tag<T>,
  f: (_: T) => Managed<R1, E1, T>,
  __etsTrace?: string
) {
  return <R, E, A>(
    self: Managed<R & Has<T>, E, A>
  ): Managed<R & R1 & Has<T>, E | E1, A> => updateServiceManaged_(self, _, f)
}
