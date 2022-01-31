// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum_<R, E, A, A1, S>(
  self: C.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => Tp.Tuple<[S, A1]>
): C.Stream<R, E, A1> {
  const accumulator = (
    currS: S
  ): CH.Channel<unknown, E, CK.Chunk<A>, unknown, E, CK.Chunk<A1>, void> =>
    CH.readWith(
      (in_) => {
        const {
          tuple: [nextS, a2s]
        } = CK.mapAccum_(in_, currS, f)

        return CH.zipRight_(CH.write(a2s), accumulator(nextS))
      },
      (err) => CH.fail(err),
      (_) => CH.unit
    )

  return new C.Stream(self.channel[">>>"](accumulator(s)))
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 *
 * @ets_data_first mapAccum_
 */
export function mapAccum<A, A1, S>(s: S, f: (s: S, a: A) => Tp.Tuple<[S, A1]>) {
  return <R, E>(self: C.Stream<R, E, A>) => mapAccum_(self, s, f)
}
