import * as Ex from "../../Exit"
import * as O from "../../Option"
import { collect_ } from "./collect"
import type { Stream } from "./definitions"

/**
 * Filters any `Exit.Failure` values.
 */
export function collectSuccess<R, E, O1, L1>(
  self: Stream<R, E, Ex.Exit<L1, O1>>
): Stream<R, E, O1> {
  return collect_(
    self,
    Ex.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}
