// ets_tracing: off

import * as E from "../../Either"
import type { Effect } from "../definition"
import { failNow } from "./failNow"
import { foldEffect_ } from "./foldEffect"
import { succeedNow } from "./succeedNow"

/**
 * Converts a `Effect<R, Either<B, E>, A>` into a `Effect<R, E, Either<B, A>>`.
 * The inverse of `right`.
 */
export function unright<R, B, E, A>(
  self: Effect<R, E.Either<B, E>, A>,
  __trace?: string
): Effect<R, E, E.Either<B, A>> {
  return foldEffect_(
    self,
    (e) => E.fold_(e, (b) => succeedNow(E.left(b)), failNow),
    (a) => succeedNow(E.right(a)),
    __trace
  )
}
