import type { Either } from "../../../data/Either"
import { Option } from "../../../data/Option"
import type { Stream } from "../definition"

/**
 * Filters any `Left` values.
 *
 * @tsplus fluent ets/Stream collectRight
 */
export function collectRight<R, E, L, A>(
  self: Stream<R, E, Either<L, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.collect((either) =>
    either.isRight() ? Option.some(either.right) : Option.none
  )
}
