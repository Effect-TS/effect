/**
 * Determines if the `Cause` is traced.
 *
 * @tsplus getter effect/core/io/Cause isTraced
 */
export function isTraced<E>(self: Cause<E>): boolean {
  return self
    .find((cause) =>
      (cause.isDieType() && cause.trace !== Trace.none) ||
        (cause.isFailType() && cause.trace !== Trace.none) ||
        (cause.isInterruptType() && cause.trace !== Trace.none)
        ? Maybe.some(undefined)
        : Maybe.none
    )
    .isSome()
}
