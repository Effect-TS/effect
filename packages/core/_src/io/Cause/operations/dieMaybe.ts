/**
 * Returns the value associated with the first `Die` in this `Cause` if
 * one exists.
 *
 * @tsplus getter ets/Cause dieMaybe
 */
export function dieMaybe<E>(self: Cause<E>): Maybe<unknown> {
  return self.find((cause) => cause.isDieType() ? Maybe.some(cause.value) : Maybe.none)
}
