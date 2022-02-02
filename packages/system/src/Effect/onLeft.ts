// ets_tracing: off

import type { Effect } from "./effect.js"
import { environment } from "./environment.js"
import { joinEither_ } from "./join.js"

/**
 * Returns this effect if environment is on the left, otherwise returns
 * whatever is on the right unmodified. Note that the result is lifted
 * in either.
 */
export function onLeft<C>(__trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) =>
    joinEither_(self, environment<C>(), __trace)
}
