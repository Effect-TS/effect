import type { Has, Tag } from "../../Has"
import type { Layer } from "../definition"
import { map_ } from "./map"

/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 */
export function project_<RIn, E, ROut, T, B>(
  self: Layer<RIn, E, ROut & Has<T>>,
  _: Tag<T>,
  f: (_: T) => Has<B>
): Layer<RIn, E, Has<B>> {
  return map_(self, (environment) => f(_.read(environment)))
}

/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @ets_data_first project_
 */
export function project<T, B>(_: Tag<T>, f: (_: T) => Has<B>) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut & Has<T>>): Layer<RIn, E, Has<B>> => {
    return project_(self, _, f)
  }
}
