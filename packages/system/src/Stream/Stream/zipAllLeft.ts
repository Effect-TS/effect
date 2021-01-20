import { identity } from "../../Function"
import type { Stream } from "./definitions"
import { zipAllWith } from "./zipAllWith"

/**
 * Zips this stream with another point-wise, and keeps only elements from this stream.
 *
 * The provided default value will be used if the other stream ends before this one.
 */
export function zipAllLeft<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>
) {
  return (default_: O): Stream<R & R1, E | E1, O> =>
    zipAllWith(self, that)(identity, (_) => default_)((o) => o)
}
