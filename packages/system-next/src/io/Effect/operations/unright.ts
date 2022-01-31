import * as E from "../../../data/Either"
import { Effect } from "../definition"

/**
 * Converts a `Effect<R, Either<B, E>, A>` into a `Effect<R, E, Either<B, A>>`.
 * The inverse of `right`.
 *
 * @ets fluent ets/Effect unright
 */
export function unright<R, B, E, A>(
  self: Effect<R, E.Either<B, E>, A>,
  __etsTrace?: string
): Effect<R, E, E.Either<B, A>> {
  return self.foldEffect(
    (e) => E.fold_(e, (b) => Effect.succeedNow(E.left(b)), Effect.failNow),
    (a) => Effect.succeedNow(E.right(a))
  )
}
