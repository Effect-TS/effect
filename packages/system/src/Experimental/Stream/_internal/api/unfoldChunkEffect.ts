// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkEffect<R, E, A, S>(
  s: S,
  f: (s: S) => T.Effect<R, E, O.Option<Tp.Tuple<[CK.Chunk<A>, S]>>>
): C.Stream<R, E, A> {
  const loop = (s: S): CH.Channel<R, unknown, unknown, unknown, E, CK.Chunk<A>, any> =>
    CH.unwrap(
      T.map_(
        f(s),
        O.fold(
          () => CH.end(undefined),
          ({ tuple: [as, s] }) => CH.zipRight_(CH.write(as), loop(s))
        )
      )
    )

  return new C.Stream(loop(s))
}
