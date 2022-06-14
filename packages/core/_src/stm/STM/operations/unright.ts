/**
 * Converts a `STM<R, Either<B, E>, A>` into a `STM<R, E, Either<B, A>>`.
 * The inverse of `right`.
 *
 * @tsplus getter ets/STM unright
 */
export function unright<R, B, E, A>(
  self: STM<R, Either<B, E>, A>
): STM<R, E, Either<B, A>> {
  return self.foldSTM(
    (either) => either.fold((b) => STM.succeedNow(Either.left(b)), STM.failNow),
    (a) => STM.succeedNow(Either.right(a))
  )
}
