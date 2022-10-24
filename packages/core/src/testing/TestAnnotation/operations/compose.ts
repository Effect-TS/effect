import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"

/**
 * @tsplus static effect/core/testing/TestAnnotation.Ops compose
 * @category mutations
 * @since 1.0.0
 */
export function compose<A>(
  left: Either.Either<number, Chunk.Chunk<A>>,
  right: Either.Either<number, Chunk.Chunk<A>>
): Either.Either<number, Chunk.Chunk<A>> {
  if (Either.isLeft(left) && Either.isLeft(right)) {
    return Either.left(left.left + right.left)
  }
  if (Either.isRight(left) && Either.isRight(right)) {
    return Either.right(pipe(left.right, Chunk.concat(right.right)))
  }
  if (Either.isRight(left) && Either.isLeft(right)) {
    return right
  }
  if (Either.isLeft(left) && Either.isRight(right)) {
    return right
  }
  throw new Error("bug")
}
