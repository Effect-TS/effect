import { Either } from "../../../data/Either"
import { Effect } from "../definition"

/**
 * Converts a `Effect<R, Either<E, B>, A>` into a `Effect<R, E, Either<A, B>>`.
 * The inverse of `left`.
 *
 * @tsplus fluent ets/Effect unleft
 */
export function unleft<R, E, B, A>(
  self: Effect<R, Either<E, B>, A>,
  __tsplusTrace?: string
): Effect<R, E, Either<A, B>> {
  return self.foldEffect(
    (either) => either.fold(Effect.failNow, (b) => Effect.succeedNow(Either.right(b))),
    (a) => Effect.succeedNow(Either.left(a))
  )
}
