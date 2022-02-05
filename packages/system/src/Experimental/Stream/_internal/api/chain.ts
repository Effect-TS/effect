// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 */
export function chain_<R, E, O, R1, E1, O1>(
  self: C.Stream<R, E, O>,
  f: (o: O) => C.Stream<R1, E1, O1>
): C.Stream<R & R1, E | E1, O1> {
  return new C.Stream(
    CH.concatMap_(self.channel, (o) =>
      CK.reduce_(
        CK.map_(o, (x) => f(x).channel),
        CH.unit as CH.Channel<R1, unknown, unknown, unknown, E1, CK.Chunk<O1>, unknown>,
        (s, a) => CH.chain_(s, () => a)
      )
    )
  )
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 *
 * @ets_data_first chain_
 */
export function chain<O, R1, E1, O1>(
  f: (o: O) => C.Stream<R1, E1, O1>
): <R, E>(self: C.Stream<R, E, O>) => C.Stream<R & R1, E | E1, O1> {
  return (self) => chain_(self, f)
}
