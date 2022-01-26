import type { Has, Tag } from "../../../data/Has"
import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Updates a service at the specified key in the environment of this effect.
 *
 * @ets fluent ets/Managed updateServiceEffect
 */
export function updateServiceEffect_<R, E, A, R1, E1, T>(
  self: Managed<R & Has<T>, E, A>,
  _: Tag<T>,
  f: (_: T) => Effect<R1, E1, T>,
  __etsTrace?: string
): Managed<R & R1 & Has<T>, E | E1, A> {
  return Managed.serviceWithManaged(_)((s) =>
    self.provideServiceManaged(_)(Managed.fromEffect(f(s)) as any)
  ) as Managed<R & R1 & Has<T>, E | E1, A>
}

/**
 * Updates a service at the specified key in the environment of this effect.
 *
 * @ets_data_first updateServiceEffect_
 */
export function updateServiceEffect<R1, E1, T>(
  _: Tag<T>,
  f: (_: T) => Effect<R1, E1, T>,
  __etsTrace?: string
) {
  return <R, E, A>(
    self: Managed<R & Has<T>, E, A>
  ): Managed<R & R1 & Has<T>, E | E1, A> => updateServiceEffect_(self, _, f)
}
