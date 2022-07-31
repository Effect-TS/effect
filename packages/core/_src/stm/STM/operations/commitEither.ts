/**
 * Commits this transaction atomically, regardless of whether the transaction
 * is a success or a failure.
 *
 * @tsplus getter effect/core/stm/STM commitEither
 */
export function commitEither<R, E, A>(self: STM<R, E, A>): Effect<R, E, A> {
  return self.either.commit.absolve
}
