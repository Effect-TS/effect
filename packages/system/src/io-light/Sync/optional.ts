import { Option } from "../../data/Option"
import type { Sync as Effect } from "./core"
import { fail, foldM_, succeed } from "./core"

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(
  self: Effect<R, Option<E>, A>
): Effect<R, E, Option<A>> {
  return foldM_(
    self,
    (_) => _.fold(() => succeed(Option.none), fail),
    (a) => succeed(Option.some(a))
  )
}
