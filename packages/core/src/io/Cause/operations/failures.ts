import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 *
 * @tsplus getter effect/core/io/Cause failures
 * @category destructors
 * @since 1.0.0
 */
export function failures<E>(self: Cause<E>): List.List<E> {
  return List.reverse(
    self.reduce(
      List.empty<E>(),
      (acc, curr) =>
        curr.isFailType() ?
          Option.some(pipe(acc, List.prepend(curr.value))) :
          Option.some(acc)
    )
  )
}
