// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Like `unfoldChunkEff`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunkEffect<R, E, A, S>(
  s: S,
  f: (s: S) => T.Effect<R, E, Tp.Tuple<[CK.Chunk<A>, O.Option<S>]>>
): C.Stream<R, E, A> {
  const loop = (s: S): CH.Channel<R, unknown, unknown, unknown, E, CK.Chunk<A>, any> =>
    CH.unwrap(
      T.map_(f(s), ({ tuple: [as, o] }) =>
        O.fold_(
          o,
          () => CH.zipRight_(CH.write(as), CH.end(undefined)),
          (s) => CH.zipRight_(CH.write(as), loop(s))
        )
      )
    )

  return new C.Stream(loop(s))
}
