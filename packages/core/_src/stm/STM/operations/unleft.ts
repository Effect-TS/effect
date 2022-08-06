/**
 * Converts a `STM<R, Either<E, B>, A>` into a `STM<R, E, Either<A, B>>`.
 * The inverse of `left`.
 *
 * @tsplus getter effect/core/stm/STM unleft
 */
export function unleft<R, E, B, A>(
  self: STM<R, Either<E, B>, A>
): STM<R, E, Either<A, B>> {
  return self.foldSTM(
    (either) => either.fold(STM.failNow, (b) => STM.succeed(Either.right(b))),
    (a) => STM.succeed(Either.left(a))
  )
}
