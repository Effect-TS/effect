// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as O from "../../../../Option"
import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Zips each element with the next element if present.
 */
export function zipWithNext<R, E, A>(
  self: C.Stream<R, E, A>
): C.Stream<R, E, Tp.Tuple<[A, O.Option<A>]>> {
  const process = (
    last: O.Option<A>
  ): CH.Channel<
    unknown,
    E,
    CK.Chunk<A>,
    unknown,
    E,
    CK.Chunk<Tp.Tuple<[A, O.Option<A>]>>,
    void
  > =>
    CH.readWith(
      (in_) => {
        const {
          tuple: [newlast, chunk]
        } = CK.mapAccum_(in_, last, (prev, curr) =>
          Tp.tuple(
            O.some(curr),
            O.map_(prev, (_) => Tp.tuple(_, curr))
          )
        )
        const out = CK.collectChunk_(
          chunk,
          O.fold(
            () => O.none,
            ({ tuple: [prev, curr] }) => O.some(Tp.tuple(prev, O.some(curr)))
          )
        )

        return CH.zipRight_(CH.write(out), process(newlast))
      },
      (err) => CH.fail(err),
      (_) =>
        O.fold_(
          last,
          () => CH.unit,
          (value) => CH.zipRight_(CH.write(CK.single(Tp.tuple(value, O.none))), CH.unit)
        )
    )

  return new C.Stream(self.channel[">>>"](process(O.none)))
}
