// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import type * as Tp from "../../Collections/Immutable/Tuple"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import { paginateChunkM } from "./paginateChunkM"

/**
 * Like `unfoldChunk`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunk<S, A>(
  s: S,
  f: (s: S) => Tp.Tuple<[A.Chunk<A>, O.Option<S>]>
) {
  return paginateChunkM(s, (s) => T.succeed(f(s)))
}
