/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 *
 * @tsplus getter ets/Cause isInterruptedOnly
 */
export function isInterruptedOnly<E>(self: Cause<E>): boolean {
  return self
    .find((cause) => cause.isDieType() || cause.isFailType() ? Maybe.some(false) : Maybe.none)
    .getOrElse(true)
}
