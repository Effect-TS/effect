// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Creates a stream that groups on adjacent keys, calculated by function f.
 */
export function groupAdjacentBy_<R, E, A, K>(
  self: C.Stream<R, E, A>,
  f: (a: A) => K
): C.Stream<R, E, Tp.Tuple<[K, CK.Chunk<A>]>> {
  type OO = Tp.Tuple<[K, CK.Chunk<A>]>

  const go = (
    in_: CK.Chunk<A>,
    state: O.Option<OO>
  ): Tp.Tuple<[CK.Chunk<OO>, O.Option<OO>]> =>
    CK.reduce_(in_, Tp.tuple(CK.empty<OO>(), state), ({ tuple: [os, o] }, a) =>
      O.fold_(
        o,
        () => Tp.tuple(os, O.some(Tp.tuple(f(a), CK.single(a)))),
        (agg) => {
          const k2 = f(a)
          const {
            tuple: [k, aggregated]
          } = agg

          if (k === k2) {
            return Tp.tuple(os, O.some(Tp.tuple(k, CK.append_(aggregated, a))))
          } else {
            return Tp.tuple(CK.append_(os, agg), O.some(Tp.tuple(k2, CK.single(a))))
          }
        }
      )
    )

  const chunkAdjacent = (
    buffer: O.Option<OO>
  ): CH.Channel<R, E, CK.Chunk<A>, unknown, E, CK.Chunk<OO>, void> =>
    CH.readWithCause(
      (chunk) => {
        const {
          tuple: [outputs, newBuffer]
        } = go(chunk, buffer)

        return CH.zipRight_(CH.write(outputs), chunkAdjacent(newBuffer))
      },
      (_) => CH.failCause(_),
      (_) =>
        O.fold_(
          buffer,
          () => CH.unit,
          (o) => CH.write(CK.single(o))
        )
    )

  return new C.Stream(self.channel[">>>"](chunkAdjacent(O.none)))
}

/**
 * Creates a stream that groups on adjacent keys, calculated by function f.
 *
 * @ets_data_first groupAdjacentBy_
 */
export function groupAdjacentBy<A, K>(f: (a: A) => K) {
  return <R, E>(self: C.Stream<R, E, A>) => groupAdjacentBy_(self, f)
}
