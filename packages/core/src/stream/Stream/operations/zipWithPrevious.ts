import { Tuple } from "../../../collection/immutable/Tuple"
import { Option } from "../../../data/Option"
import type { Stream } from "../definition"

/**
 * Zips each element with the previous element. Initially accompanied by
 * `None`.
 *
 * @tsplus fluent ets/Stream zipWithPrevious
 */
export function zipWithPrevious<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, Tuple<[Option<A>, A]>> {
  return self.mapAccum(Option.emptyOf<A>(), (prev, next) =>
    Tuple(Option.some(next), Tuple(prev, next))
  )
}
