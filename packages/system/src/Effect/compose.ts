// tracing: off

import { chain_, provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Uses the output of `that` to provide to `self`
 *
 * @dataFirst compose_
 */
export function compose<A, E1, B>(that: Effect<A, E1, B>, __trace?: string) {
  return <R, E>(self: Effect<R, E, A>) => compose_(self, that, __trace)
}

/**
 * Uses the output of `that` to provide to `self`
 */
export function compose_<A, E1, B, R, E>(
  self: Effect<R, E, A>,
  that: Effect<A, E1, B>,
  __trace?: string
) {
  return chain_(self, (r) => provideAll_(that, r), __trace)
}
