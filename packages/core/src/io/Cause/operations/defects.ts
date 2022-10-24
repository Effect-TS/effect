import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 *
 * @tsplus getter effect/core/io/Cause defects
 * @category destructors
 * @since 1.0.0
 */
export function defects<E>(self: Cause<E>): List.List<unknown> {
  return List.reverse(
    self.reduce(
      List.empty<unknown>(),
      (causes, cause) =>
        cause.isDieType() ?
          Option.some(pipe(causes, List.prepend(cause.value))) :
          Option.none
    )
  )
}
