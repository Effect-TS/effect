/**
 * Returns a successful effect if the value is `Left`, or fails with a
 * `NoSuchElementException`.
 *
 * @tsplus getter effect/core/stm/STM leftOrFailException
 */
export function leftOrFailException<R, E, B, C>(self: STM<R, E, Either<B, C>>) {
  return self.leftOrFail(() => new NoSuchElement())
}
