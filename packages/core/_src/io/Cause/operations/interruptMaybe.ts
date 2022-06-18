/**
 * Returns the `FiberId` associated with the first `Interrupt` in this `Cause`
 * if one exists.
 *
 * @tsplus getter ets/Cause interruptMaybe
 */
export function interruptMaybe<E>(self: Cause<E>): Maybe<FiberId> {
  return self.find((cause) => cause.isInterruptType() ? Maybe.some(cause.fiberId) : Maybe.none)
}
