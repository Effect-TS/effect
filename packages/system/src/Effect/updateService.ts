import type { Has, Tag } from "../Has"
import type { Effect } from "./effect"
import { provideSome_ } from "./provideSome"

/**
 * Updates a service in the environment of this effect.
 */
export function updateService_<T, R, E, A>(
  self: Effect<R, E, A>,
  tag: Tag<T>,
  f: (_: T) => T
): Effect<R & Has<T>, E, A> {
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
): <R, E, A>(self: Effect<R, E, A>) => Effect<R & Has<T>, E, A> {
  return (self) => updateService_(self, tag, f)
}
