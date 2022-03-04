import { Either } from "../../../data/Either"
import { STM } from "../definition"

/**
 * Converts a `STM<R, Either<E, B>, A>` into a `STM<R, E, Either<A, B>>`.
 * The inverse of `left`.
 *
 * @tsplus fluent ets/STM unleft
 */
export function unleft<R, E, B, A>(
  self: STM<R, Either<E, B>, A>
): STM<R, E, Either<A, B>> {
  return self.foldSTM(
    (either) => either.fold(STM.failNow, (b) => STM.succeedNow(Either.right(b))),
    (a) => STM.succeedNow(Either.left(a))
  )
}
