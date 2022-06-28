/**
 * Determines if the `Cause` contains an interruption.
 *
 * @tsplus getter effect/core/io/Cause isInterrupted
 */
export function isInterrupted<E>(self: Cause<E>): boolean {
  return self
    .find((cause) => (cause.isInterruptType() ? Maybe.some(undefined) : Maybe.none))
    .isSome()
}
