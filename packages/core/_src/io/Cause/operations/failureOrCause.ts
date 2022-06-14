/**
 * Retrieve the first checked error on the `Left` if available, if there are
 * no checked errors return the rest of the `Cause` that is known to contain
 * only `Die` or `Interrupt` causes.
 *
 * @tsplus getter ets/Cause failureOrCause
 */
export function failureOrCause<E>(self: Cause<E>): Either<E, Cause<never>> {
  return self.failureOption.fold(
    () => Either.right(self as Cause<never>), // no E inside this cause, can safely cast
    Either.left
  )
}
