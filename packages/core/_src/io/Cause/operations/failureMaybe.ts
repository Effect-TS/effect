/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 *
 * @tsplus getter effect/core/io/Cause failureMaybe
 */
export function failureMaybe<E>(self: Cause<E>): Maybe<E> {
  return self.find((cause) => cause.isFailType() ? Maybe.some(cause.value) : Maybe.none)
}
