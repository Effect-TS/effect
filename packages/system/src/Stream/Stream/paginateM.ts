// tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import * as Tp from "../../Collections/Immutable/Tuple"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { paginateChunkM } from "./paginateChunkM"

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
