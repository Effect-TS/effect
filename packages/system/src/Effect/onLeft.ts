import type { Effect } from "./effect"
import { environment } from "./environment"
import { joinEither_ } from "./join"

/**
 * Returns this effect if environment is on the left, otherwise returns
 * whatever is on the right unmodified. Note that the result is lifted
 * in either.
 */
export function onLeft<C>() {
  return <R, E, A>(self: Effect<R, E, A>) => joinEither_(self, environment<C>())
}
