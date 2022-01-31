// ets_tracing: off

import * as E from "../../Either/index.js"
import * as O from "../../Option/index.js"
import { collect_ } from "./collect.js"
import type { Stream } from "./definitions.js"

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
