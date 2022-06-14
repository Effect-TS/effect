/**
 * Converts the failure channel into an `Either`.
 *
 * @tsplus getter ets/STM either
 */
export function either<R, E, A>(self: STM<R, E, A>): STM<R, never, Either<E, A>> {
  return self.fold(Either.left, Either.right)
}
