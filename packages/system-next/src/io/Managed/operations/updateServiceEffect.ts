import type { Has, Tag } from "../../../data/Has"
import type { Managed } from "../definition"
import type { Effect } from "./_internal/effect-api"
import { fromEffect } from "./fromEffect"
import { provideServiceManaged } from "./provideServiceManaged"
import { serviceWithManaged } from "./serviceWithManaged"

/**
 * Updates a service at the specified key in the environment of this effect.
 */
export function updateServiceEffect_<R, E, A, R1, E1, T>(
  self: Managed<R & Has<T>, E, A>,
  _: Tag<T>,
  f: (_: T) => Effect<R1, E1, T>,
  __trace?: string
): Managed<R & R1 & Has<T>, E | E1, A> {
  return serviceWithManaged(_)(
    (s) => provideServiceManaged(_)(fromEffect(f(s)))(self),
    __trace
  )
}

/**
 * Updates a service at the specified key in the environment of this effect.
 *
 * @ets_data_first updateServiceEffect_
 */
export function updateServiceEffect<R1, E1, T>(
  _: Tag<T>,
  f: (_: T) => Effect<R1, E1, T>,
  __trace?: string
) {
  return <R, E, A>(
    self: Managed<R & Has<T>, E, A>
  ): Managed<R & R1 & Has<T>, E | E1, A> => updateServiceEffect_(self, _, f, __trace)
}
