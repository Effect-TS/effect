import type { Effect } from "../../Effect/definition"
import type { Has, Tag } from "../../Has"
import { provideServiceEffect } from "./provideServiceEffect"
import { serviceWithEffect } from "./serviceWithEffect"
import { succeed } from "./succeed"

/**
 * Updates the service with the required service entry.
 */
export function updateService_<R, E, A, T>(
  effect: Effect<R & Has<T>, E, A>,
  _: Tag<T>,
  f: (_: T) => T,
  __trace?: string
): Effect<R & Has<T>, E, A> {
  return serviceWithEffect(_)((t) =>
    provideServiceEffect(_)(
      succeed(() => f(t)),
      __trace
    )(effect)
  )
}

/**
 * Updates the service with the required service entry.
 */
export function updateService<T>(_: Tag<T>, f: (_: T) => T, __trace?: string) {
  return <R, E, A>(effect: Effect<R & Has<T>, E, A>): Effect<R & Has<T>, E, A> =>
    updateService_(effect, _, f, __trace)
}
