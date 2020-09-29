import { chain_, provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Uses the output of `that` to provide to `self`
 */
export function compose<R2, E2, R>(that: Effect<R2, E2, R>) {
  return <E, A>(self: Effect<R, E, A>) => chain_(that, (r) => provideAll_(self, r))
}
