import { Either } from "../../../data/Either"
import { Effect } from "../definition"

/**
 * "Zooms in" on the value in the `Right` side of an `Either`, moving the
 * possibility that the value is a `Left` to the error channel.
 *
 * @tsplus getter ets/Effect right
 */
export function right<R, E, A, B>(
  self: Effect<R, E, Either<A, B>>,
  __etsTrace?: string
): Effect<R, Either<A, E>, B> {
  return self.foldEffect(
    (e) => Effect.fail(Either.right(e)),
    (either) => either.fold((a) => Effect.fail(Either.left(a)), Effect.succeedNow)
  )
}
