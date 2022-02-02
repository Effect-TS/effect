// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import type * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as PaginateChunkEffect from "./paginateChunkEffect.js"

/**
 * Like `unfoldEff`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateEffect<R, E, A, S>(
  s: S,
  f: (s: S) => T.Effect<R, E, Tp.Tuple<[A, O.Option<S>]>>
): C.Stream<R, E, A> {
  return PaginateChunkEffect.paginateChunkEffect(s, (_) =>
    T.map_(f(_), ({ tuple: [a, s] }) => Tp.tuple(CK.single(a), s))
  )
}
