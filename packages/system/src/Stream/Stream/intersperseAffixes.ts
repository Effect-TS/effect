// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import { concat } from "./concat.js"
import type { Stream } from "./definitions.js"
import { fromChunk } from "./fromChunk.js"
import { intersperse_ } from "./intersperse.js"
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
    fromChunk(A.single(start)),
    concat(intersperse_(self, middle)),
    concat(fromChunk(A.single(end)))
  )
}
