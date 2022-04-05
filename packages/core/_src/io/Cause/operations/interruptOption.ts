/**
 * Returns the `FiberId` associated with the first `Interrupt` in this `Cause`
 * if one exists.
 *
 * @tsplus fluent ets/Cause interruptOption
 */
export function interruptOption<E>(self: Cause<E>): Option<FiberId> {
  return self.find((cause) => cause.isInterruptType() ? Option.some(cause.fiberId) : Option.none);
}
