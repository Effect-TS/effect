import * as Either from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * Terminates the stream when encountering the first `Right`.
 *
 * @tsplus getter effect/core/stream/Stream collectWhileLeft
 * @category mutations
 * @since 1.0.0
 */
export function collectWhileLeft<R, E, L, A>(
  self: Stream<R, E, Either.Either<L, A>>
): Stream<R, E, L> {
  return self.collectWhile((either) =>
    Either.isLeft(either) ?
      Option.some(either.left) :
      Option.none
  )
}
