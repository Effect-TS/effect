/**
 * "Zooms in" on the value in the `Right` side of an `Either`, moving the
 * possibility that the value is a `Left` to the error channel.
 *
 * @tsplus getter ets/STM right
 */
export function right<R, E, A, B>(
  self: STM<R, E, Either<A, B>>
): STM<R, Either<A, E>, B> {
  return self.foldSTM(
    (e) => STM.fail(Either.right(e)),
    (either) => either.fold((a) => STM.fail(Either.left(a)), STM.succeedNow)
  );
}
