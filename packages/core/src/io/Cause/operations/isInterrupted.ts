import * as Option from "@fp-ts/data/Option"

/**
 * Determines if the `Cause` contains an interruption.
 *
 * @tsplus getter effect/core/io/Cause isInterrupted
 * @category destructors
 * @since 1.0.0
 */
export function isInterrupted<E>(self: Cause<E>): boolean {
  return Option.isSome(
    self.find((cause) =>
      cause.isInterruptType() ?
        Option.some(undefined) :
        Option.none
    )
  )
}
