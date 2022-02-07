// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../core.js"
import * as Concat from "./concat.js"
import * as FromChunk from "./fromChunk.js"
import * as Intersperse from "./intersperse.js"

/**
 * Intersperse and also add a prefix and a suffix
 */
export function intersperseAffixes_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  start: A1,
  middle: A1,
  end: A1
): C.Stream<R, E, A1 | A> {
  return Concat.concat_(
    Concat.concat_(
      FromChunk.fromChunk(CK.single(start)),
      Intersperse.intersperse_(self, middle)
    ),
    FromChunk.fromChunk(CK.single(end))
  )
}

/**
 * Intersperse and also add a prefix and a suffix
 *
 * @ets_data_first intersperseAffixes_
 */
export function intersperseAffixes<A1>(start: A1, middle: A1, end: A1) {
  return <R, E, A>(self: C.Stream<R, E, A>) =>
    intersperseAffixes_(self, start, middle, end)
}
