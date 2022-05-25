/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 *
 * @tsplus fluent ets/Cause failureOption
 */
export function failureOption<E>(self: Cause<E>): Option<E> {
  return self.find((cause) => cause.isFailType() ? Option.some(cause.value) : Option.none)
}
