// ets_tracing: off

import type { AnyService, Has, Tag } from "../Has"
import type { Effect } from "./effect"
import { provideSome_ } from "./provideSome"

/**
 * Updates a service in the environment of this effect.
 */
export function updateService_<T extends AnyService, R, E, A>(
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
export function updateService<T extends AnyService>(
  tag: Tag<T>,
  f: (_: T) => T,
  __trace?: string
): <R, E, A>(self: Effect<R, E, A>) => Effect<R & Has<T>, E, A> {
  return (self) => updateService_(self, tag, f, __trace)
}
