import type { Effect } from "../../Effect/definition"
import type { Has, Tag } from "../../Has"
import { provideServiceEffect } from "./provideServiceEffect"
import { serviceWithEffect } from "./serviceWithEffect"

/**
 * Updates the service with the required service entry.
 *
 * @ets fluent ets/Effect updateServiceEffect
 */
export function updateServiceEffect_<R1, E1, A, R, E, T>(
  effect: Effect<R1 & Has<T>, E1, A>,
  _: Tag<T>,
  f: (_: T) => Effect<R, E, T>,
  __trace?: string
): Effect<R & R1 & Has<T>, E | E1, A> {
  return serviceWithEffect(_)((t) => provideServiceEffect(_)(f(t), __trace)(effect))
}

/**
 * Updates the service with the required service entry.
 */
export function updateServiceEffect<R, E, T>(
  _: Tag<T>,
  f: (_: T) => Effect<R, E, T>,
  __trace?: string
) {
  return <R1, E1, A>(
    effect: Effect<R1 & Has<T>, E1, A>
  ): Effect<R & R1 & Has<T>, E | E1, A> => updateServiceEffect_(effect, _, f, __trace)
}
