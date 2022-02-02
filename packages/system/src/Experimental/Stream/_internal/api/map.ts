// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Transforms the elements of this stream using the supplied function.
 */
export function map_<R, E, O, O1>(
  self: C.Stream<R, E, O>,
  f: (o: O) => O1
): C.Stream<R, E, O1> {
  return new C.Stream(CH.mapOut_(self.channel, (o) => CK.map_(o, f)))
}

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @ets_data_first map_
 */
export function map<O, O1>(
  f: (o: O) => O1
): <R, E>(self: C.Stream<R, E, O>) => C.Stream<R, E, O1> {
  return (self) => map_(self, f)
}
