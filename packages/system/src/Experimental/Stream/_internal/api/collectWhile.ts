// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import type * as O from "../../../../Option"
import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  pf: (a: A) => O.Option<A1>
): C.Stream<R, E, A1> {
  const loop: CH.Channel<
    R,
    E,
    CK.Chunk<A>,
    unknown,
    E,
    CK.Chunk<A1>,
    any
  > = CH.readWith(
    (_in) => {
      const mapped = CK.collectWhile_(_in, pf)

      if (CK.size(mapped) === CK.size(_in)) {
        return CH.zipRight_(CH.write(mapped), loop)
      } else {
        return CH.write(mapped)
      }
    },
    CH.fail,
    CH.succeed
  )

  return new C.Stream(self.channel[">>>"](loop))
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 *
 * @ets_data_first collectWhile_
 */
export function collectWhile<A, A1>(pf: (a: A) => O.Option<A1>) {
  return <R, E>(self: C.Stream<R, E, A>) => collectWhile_(self, pf)
}
