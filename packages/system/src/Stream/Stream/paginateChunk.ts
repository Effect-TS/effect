// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import { paginateChunkM } from "./paginateChunkM.js"

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
