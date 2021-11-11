// ets_tracing: off

import type { AnyService, ServiceConstructor, Tag } from "../Has"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to a service.
 *
 * @datFirst asService_
 */
export function asService<A extends AnyService>(has: Tag<A>, __trace?: string) {
  return <R, E>(fa: Effect<R, E, ServiceConstructor<A>>) => asService_(fa, has, __trace)
}

/**
 * Maps the success value of this effect to a service.
 */
export function asService_<R, E, A extends AnyService>(
  fa: Effect<R, E, ServiceConstructor<A>>,
  tag: Tag<A>,
  __trace?: string
) {
  return map_(fa, tag.has, __trace)
}
