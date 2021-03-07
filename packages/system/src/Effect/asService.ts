// tracing: off

import type { Tag } from "../Has"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to a service.
 *
 * @datFirst asService_
 */
export function asService<A>(has: Tag<A>) {
  return <R, E>(fa: Effect<R, E, A>) => asService_(fa, has)
}

/**
 * Maps the success value of this effect to a service.
 */
export function asService_<R, E, A>(fa: Effect<R, E, A>, has: Tag<A>) {
  return map_(fa, has.of)
}
