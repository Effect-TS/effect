// ets_tracing: off

import type { AnyService, Has, Tag } from "../../Has"
import { provideSome_ } from "../core"
import type { Managed } from "../managed"

/**
 * Updates a service in the environment of this effect.
 */
export function updateService_<T extends AnyService, R, E, A>(
  self: Managed<R, E, A>,
  tag: Tag<T>,
  f: (_: T) => T,
  __trace?: string
): Managed<R & Has<T>, E, A> {
  return provideSome_(
    self,
    (r: R & Has<T>) => ({ ...r, ...tag.of(f(tag.read(r))) }),
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
): <R, E, A>(self: Managed<R, E, A>) => Managed<R & Has<T>, E, A> {
  return (self) => updateService_(self, tag, f, __trace)
}
