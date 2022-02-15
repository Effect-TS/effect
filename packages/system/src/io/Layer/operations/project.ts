import type { Has, Tag } from "../../../data/Has"
import type { Layer } from "../definition"

/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @tsplus fluent ets/Layer project
 */
export function project_<RIn, E, ROut, T, B>(
  self: Layer<RIn, E, ROut & Has<T>>,
  _: Tag<T>,
  f: (_: T) => Has<B>
): Layer<RIn, E, Has<B>> {
  return self.map((environment) => f(_.read(environment)))
}

/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @ets_data_first project_
 */
export function project<T, B>(_: Tag<T>, f: (_: T) => Has<B>) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut & Has<T>>): Layer<RIn, E, Has<B>> => {
    return self.project(_, f)
  }
}
