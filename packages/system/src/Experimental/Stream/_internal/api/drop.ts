// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Drops the specified number of elements from this stream.
 */
export function drop_<R, E, A>(self: C.Stream<R, E, A>, n: number): C.Stream<R, E, A> {
  const loop = (
    r: number
  ): CH.Channel<R, E, CK.Chunk<A>, unknown, E, CK.Chunk<A>, any> =>
    CH.readWith(
      (_in) => {
        const dropped = CK.drop_(_in, r)
        const leftover = Math.max(r - CK.size(_in), 0)
        const more = CK.isEmpty(_in) || leftover > 0

        if (more) {
          return loop(leftover)
        } else {
          return CH.zipRight_(CH.write(dropped), CH.identity<E, CK.Chunk<A>, any>())
        }
      },
      (e) => CH.fail(e),
      (_) => CH.unit
    )

  return new C.Stream(self.channel[">>>"](loop(n)))
}

/**
 * Drops the specified number of elements from this stream.
 *
 * @ets_data_first drop_
 */
export function drop(n: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => drop_(self, n)
}
