// ets_tracing: off

import type { Tag } from "../Has"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to a service.
 *
 * @datFirst asService_
 */
export function asService<A>(has: Tag<A>, __trace?: string) {
  return <R, E>(fa: Effect<R, E, A>) => asService_(fa, has, __trace)
}

/**
 * Maps the success value of this effect to a service.
 */
export function asService_<R, E, A>(
  fa: Effect<R, E, A>,
  tag: Tag<A>,
  __trace?: string
) {
  return map_(fa, tag.has, __trace)
}
