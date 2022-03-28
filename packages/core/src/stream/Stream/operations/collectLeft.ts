import type { Either } from "../../../data/Either"
import { Option } from "../../../data/Option"
import type { Stream } from "../definition"

/**
 * Filters any `Right` values.
 *
 * @tsplus fluent ets/Stream collectLeft
 */
export function collectLeft<R, E, L, A>(
  self: Stream<R, E, Either<L, A>>,
  __tsplusTrace?: string
): Stream<R, E, L> {
  return self.collect((either) =>
    either.isLeft() ? Option.some(either.left) : Option.none
  )
}
