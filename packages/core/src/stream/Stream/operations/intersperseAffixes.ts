import type { LazyArg } from "../../../data/Function"
import { Stream } from "../../Stream"

/**
 * Intersperse and also add a prefix and a suffix
 *
 * @tsplus fluent ets/Stream intersperseAffixes
 */
export function intersperseAffixes_<R, E, A, A2>(
  self: Stream<R, E, A>,
  start: LazyArg<A2>,
  middle: LazyArg<A2>,
  end: LazyArg<A2>,
  __tsplusTrace?: string
): Stream<R, E, A | A2> {
  return Stream.suspend(Stream(start()) + self.intersperse(middle) + Stream(end()))
}

/**
 * Intersperse and also add a prefix and a suffix
 */
export const intersperseAffixes = Pipeable(intersperseAffixes_)
