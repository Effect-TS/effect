/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists, along with its (optional) trace.
 *
 * @tsplus getter effect/core/io/Cause failureTraceMaybe
 */
export function failureTraceMaybe<E>(self: Cause<E>): Maybe<Tuple<[E, Trace]>> {
  return self.find((cause) => cause.isFailType() ? Maybe.some(Tuple(cause.value, cause.trace)) : Maybe.none)
}
