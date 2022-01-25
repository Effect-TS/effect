import * as E from "../../../data/Either"
import type { Effect } from "../definition"
import { failNow } from "./failNow"
import { foldEffect_ } from "./foldEffect"
import { succeedNow } from "./succeedNow"

/**
 * Converts a `Effect<R, Either<E, B>, A>` into a `Effect<R, E, Either<A, B>>`.
 * The inverse of `left`.
 *
 * @ets fluent ets/Effect unleft
 */
export function unleft<R, E, B, A>(
  self: Effect<R, E.Either<E, B>, A>,
  __etsTrace?: string
): Effect<R, E, E.Either<A, B>> {
  return foldEffect_(
    self,
    E.fold(failNow, (b) => succeedNow(E.right(b))),
    (a) => succeedNow(E.left(a)),
    __etsTrace
  )
}
