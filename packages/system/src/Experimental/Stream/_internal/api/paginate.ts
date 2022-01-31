// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import type * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as PaginateChunk from "./paginateChunk.js"

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
