// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { paginateChunkM } from "./paginateChunkM.js"

/**
 * Like `unfoldM`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateM<S>(s: S) {
  return <R, E, A>(
    f: (s: S) => T.Effect<R, E, Tp.Tuple<[A, O.Option<S>]>>
  ): Stream<R, E, A> =>
    paginateChunkM(s, (_) =>
      T.map_(f(_), ({ tuple: [a, s] }) => Tp.tuple(A.single(a), s))
    )
}
