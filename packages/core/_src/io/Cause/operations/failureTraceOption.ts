/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists, along with its (optional) trace.
 *
 * @tsplus getter ets/Cause failureTraceOption
 */
export function failureTraceOption<E>(self: Cause<E>): Option<Tuple<[E, Trace]>> {
  return self.find((cause) => cause.isFailType() ? Option.some(Tuple(cause.value, cause.trace)) : Option.none)
}
