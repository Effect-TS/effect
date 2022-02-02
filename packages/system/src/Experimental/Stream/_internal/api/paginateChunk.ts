// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Like `unfoldChunk`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunk<A, S>(
  s: S,
  f: (s: S) => Tp.Tuple<[CK.Chunk<A>, O.Option<S>]>
): C.UIO<A> {
  const loop = (
    s: S
  ): CH.Channel<unknown, unknown, unknown, unknown, never, CK.Chunk<A>, any> => {
    const {
      tuple: [as, o]
    } = f(s)

    return O.fold_(
      o,
      () => CH.zipRight_(CH.write(as), CH.end(undefined)),
      (s) => CH.zipRight_(CH.write(as), loop(s))
    )
  }

  return new C.Stream(loop(s))
}
