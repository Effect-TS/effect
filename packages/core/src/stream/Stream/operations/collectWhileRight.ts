import * as Either from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * Terminates the stream when encountering the first `Left`.
 *
 * @tsplus getter effect/core/stream/Stream collectWhileRight
 * @category mutations
 * @since 1.0.0
 */
export function collectWhileRight<R, E, L, A>(
  self: Stream<R, E, Either.Either<L, A>>
): Stream<R, E, A> {
  return self.collectWhile((either) =>
    Either.isRight(either) ?
      Option.some(either.right) :
      Option.none
  )
}
