// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as Tp from "../../../../Collections/Immutable/Tuple"
import type * as O from "../../../../Option"
import type * as C from "../core"
import * as PaginateChunk from "./paginateChunk"

/**
 * Like `unfold`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginate<A, S>(
  s: S,
  f: (s: S) => Tp.Tuple<[A, O.Option<S>]>
): C.UIO<A> {
  return PaginateChunk.paginateChunk(s, (s) => {
    const {
      tuple: [a, b]
    } = f(s)

    return Tp.tuple(CK.single(a), b)
  })
}
