/**
 * "Zooms in" on the value in the `Left` side of an `Either`, moving the
 * possibility that the value is a `Right` to the error channel.
 *
 * @tsplus getter effect/core/stm/STM left
 */
export function left<R, E, A, B>(
  self: STM<R, E, Either<A, B>>
): STM<R, Either<E, B>, A> {
  return self.foldSTM(
    (e) => STM.fail(Either.left(e)),
    (either) => either.fold(STM.succeedNow, (b) => STM.fail(Either.right(b)))
  )
}
