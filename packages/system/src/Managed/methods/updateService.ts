// tracing: off

import type { Has, Tag } from "../../Has"
import { provideSome_ } from "../core"
import type { Managed } from "../managed"

/**
 * Updates a service in the environment of this effect.
 */
export function updateService_<T, R, E, A>(
  self: Managed<R, E, A>,
  tag: Tag<T>,
  f: (_: T) => T
): Managed<R & Has<T>, E, A> {
  return provideSome_(self, (r: R & Has<T>) => ({ ...r, ...tag.of(f(tag.read(r))) }))
}

/**
 * Updates a service in the environment of this effect.
 *
 * @dataFirst updateService_
 */
export function updateService<T>(
  tag: Tag<T>,
  f: (_: T) => T
): <R, E, A>(self: Managed<R, E, A>) => Managed<R & Has<T>, E, A> {
  return (self) => updateService_(self, tag, f)
}
