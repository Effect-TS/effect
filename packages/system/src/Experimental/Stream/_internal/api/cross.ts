// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function cross_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R & R1, E | E1, Tp.Tuple<[A, A1]>> {
  return new C.Stream(
    CH.concatMap_(self.channel, (a) =>
      CH.mapOut_(that.channel, (b) =>
        CK.chain_(a, (a) => CK.map_(b, (b) => Tp.tuple(a, b)))
      )
    )
  )
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * @ets_data_first cross_
 */
export function cross<R1, E1, A1>(that: C.Stream<R1, E1, A1>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => cross_(self, that)
}
