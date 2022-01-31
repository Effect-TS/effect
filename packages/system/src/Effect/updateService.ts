// ets_tracing: off

import type { Has, Tag } from "../Has/index.js"
import type { Effect } from "./effect.js"
import { provideSome_ } from "./provideSome.js"

/**
 * Updates a service in the environment of this effect.
 */
export function updateService_<T, R, E, A>(
  self: Effect<R, E, A>,
  tag: Tag<T>,
  f: (_: T) => T,
  __trace?: string
): Effect<R & Has<T>, E, A> {
  return provideSome_(
    self,
    (r: R & Has<T>) => ({ ...r, ...tag.has(f(tag.read(r))) }),
    __trace
  )
}

/**
 * Updates a service in the environment of this effect.
 *
 * @ets_data_first updateService_
 */
export function updateService<T>(
  tag: Tag<T>,
  f: (_: T) => T,
  __trace?: string
): <R, E, A>(self: Effect<R, E, A>) => Effect<R & Has<T>, E, A> {
  return (self) => updateService_(self, tag, f, __trace)
}
