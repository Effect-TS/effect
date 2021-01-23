import * as O from "../Option"
import { succeed } from "./core"
import type { Effect, RIO } from "./effect"
import { foldM_ } from "./foldM"

/**
 * Converts an option on errors into an option on values.
 */
export function option<R, E, A>(self: Effect<R, E, A>): RIO<R, O.Option<A>> {
  return foldM_(
    self,
    () => succeed(O.none),
    (a) => succeed(O.some(a))
  )
}
