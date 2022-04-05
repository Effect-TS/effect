/**
 * Returns a computation whose failure and success have been lifted into an
 * `Either`. The resulting computation cannot fail, because the failure case
 * has been exposed as part of the `Either` success case.
 *
 * @tsplus fluent ets/XPure either
 */
export function either<W, S1, S2, R, E, A>(
  self: XPure<W, S1, S2, R, E, A>
): XPure<W, S1 & S2, S1 | S2, R, never, Either<E, A>> {
  return self.fold(Either.left, Either.right);
}
