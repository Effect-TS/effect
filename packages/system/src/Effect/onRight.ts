// ets_tracing: off

import type { Effect } from "./effect"
import { environment } from "./environment"
import { joinEither_ } from "./join"

/**
 * Returns this effect if environment is on the right, otherwise returns
 * whatever is on the left unmodified. Note that the result is lifted
 * in either.
 */
export function onRight<C>(__trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) =>
    joinEither_(environment<C>(), self, __trace)
}
