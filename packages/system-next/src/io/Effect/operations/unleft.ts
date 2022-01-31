import * as E from "../../../data/Either"
import { Effect } from "../definition"

/**
 * Converts a `Effect<R, Either<E, B>, A>` into a `Effect<R, E, Either<A, B>>`.
 * The inverse of `left`.
 *
 * @tsplus fluent ets/Effect unleft
 */
export function unleft<R, E, B, A>(
  self: Effect<R, E.Either<E, B>, A>,
  __etsTrace?: string
): Effect<R, E, E.Either<A, B>> {
  return self.foldEffect(
    E.fold(Effect.failNow, (b) => Effect.succeedNow(E.right(b))),
    (a) => Effect.succeedNow(E.left(a))
  )
}
