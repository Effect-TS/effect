import type { Effect } from "../definition"
import { environment } from "./environment"
import { joinEither_ } from "./joinEither"

/**
 * Returns this effect if environment is on the right, otherwise returns
 * whatever is on the left unmodified. Note that the result is lifted
 * in either.
 */
export function onRight<C>(__trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) =>
    joinEither_(environment<C>(), self, __trace)
}
