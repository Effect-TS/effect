import { identity } from "../../Function"
import type * as O from "../../Option"
import { collect_ } from "./collect"
import type { Stream } from "./definitions"

/**
 * Filters any 'None' values.
 */
export function collectSome<R, E, O1>(
  self: Stream<R, E, O.Option<O1>>
): Stream<R, E, O1> {
  return collect_(self, identity)
}
