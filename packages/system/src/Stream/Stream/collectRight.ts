import * as E from "../../Either"
import * as O from "../../Option"
import { collect_ } from "./collect"
import type { Stream } from "./definitions"

/**
 * Filters any `Right` values.
 */
export function collectRight<R, E, O, O1, L1>(
  self: Stream<R, E, E.Either<L1, O1>>
): Stream<R, E, O1> {
  return collect_(
    self,
    E.fold(
      (_) => O.none,
      (r) => O.some(r)
    )
  )
}
