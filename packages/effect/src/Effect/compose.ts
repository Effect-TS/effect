import { chain_, provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Uses the output of `that` to provide to `self`
 */
export function compose<B, E2, C>(that: Effect<B, E2, C>) {
  return <A, E>(self: Effect<A, E, B>) => chain_(self, (r) => provideAll_(that, r))
}
