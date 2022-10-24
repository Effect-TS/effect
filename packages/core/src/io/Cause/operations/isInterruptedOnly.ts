import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 *
 * @tsplus getter effect/core/io/Cause isInterruptedOnly
 * @category destructors
 * @since 1.0.0
 */
export function isInterruptedOnly<E>(self: Cause<E>): boolean {
  return pipe(
    self.find((cause) =>
      cause.isDieType() || cause.isFailType() ?
        Option.some(false) :
        Option.none
    ),
    Option.getOrElse(true)
  )
}
