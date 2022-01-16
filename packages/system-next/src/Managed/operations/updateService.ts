// ets_tracing: off

import type { Has, Tag } from "../../Has"
import type { Managed } from "../definition"
import { provideServiceManaged } from "./provideServiceManaged"
import { serviceWithManaged } from "./serviceWithManaged"
import { succeedNow } from "./succeedNow"

/**
 * Updates a service at the specified key in the environment of this effect.
 */
export function updateService_<R, E, A, T>(
  self: Managed<R & Has<T>, E, A>,
  _: Tag<T>,
  f: (_: T) => T,
  __trace?: string
): Managed<R & Has<T>, E, A> {
  return serviceWithManaged(_)(
    (s) => provideServiceManaged(_)(succeedNow(f(s)))(self),
    __trace
  )
}

/**
 * Updates a service at the specified key in the environment of this effect.
 *
 * @ets_data_first updateService_
 */
export function updateService<T>(_: Tag<T>, f: (_: T) => T, __trace?: string) {
  return <R, E, A>(self: Managed<R & Has<T>, E, A>): Managed<R & Has<T>, E, A> =>
    updateService_(self, _, f, __trace)
}
