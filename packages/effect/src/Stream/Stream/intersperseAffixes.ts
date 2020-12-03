import { pipe } from "../../Function"
import { concat } from "./concat"
import type { Stream } from "./definitions"
import { fromChunk } from "./fromChunk"
import { intersperse_ } from "./intersperse"

/**
 * Intersperse and also add a prefix and a suffix
 */
export function intersperseAffixes<R, E, O, O1>(
  self: Stream<R, E, O>,
  start: O1,
  middle: O1,
  end: O1
): Stream<R, E, O | O1> {
  return pipe(
    fromChunk([start]),
    concat(intersperse_(self, middle)),
    concat(fromChunk([end]))
  )
}
