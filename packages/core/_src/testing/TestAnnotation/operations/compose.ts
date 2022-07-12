/**
 * @tsplus static effect/core/testing/TestAnnotation.Ops compose
 */
export function compose<A>(left: Either<number, Chunk<A>>, right: Either<number, Chunk<A>>): Either<number, Chunk<A>> {
  if (left.isLeft() && right.isLeft()) {
    return Either.left(left.left + right.left)
  }
  if (left.isRight() && right.isRight()) {
    return Either.right(left.right.concat(right.right))
  }
  if (left.isRight() && right.isLeft()) {
    return right
  }
  if (left.isLeft() && right.isRight()) {
    return right
  }
  throw new Error("bug")
}
