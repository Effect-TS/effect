import { Either } from "../../../data/Either"
import { Effect } from "../definition"

/**
 * "Zooms in" on the value in the `Left` side of an `Either`, moving the
 * possibility that the value is a `Right` to the error channel.
 *
 * @tsplus getter ets/Effect left
 */
export function left<R, E, A, B>(
  self: Effect<R, E, Either<A, B>>,
  __tsplusTrace?: string
): Effect<R, Either<E, B>, A> {
  return self.foldEffect(
    (e) => Effect.fail(Either.left(e)),
    (either) => either.fold(Effect.succeedNow, (b) => Effect.fail(Either.right(b)))
  )
}
