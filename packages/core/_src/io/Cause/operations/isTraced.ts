/**
 * Determines if the `Cause` is traced.
 *
 * @tsplus getter ets/Cause isTraced
 */
export function isTraced<E>(self: Cause<E>): boolean {
  return self
    .find((cause) =>
      (cause.isDieType() && cause.trace !== Trace.none) ||
        (cause.isFailType() && cause.trace !== Trace.none) ||
        (cause.isInterruptType() && cause.trace !== Trace.none)
        ? Option.some(undefined)
        : Option.none
    )
    .isSome()
}
