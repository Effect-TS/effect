import * as A from "../../Array/core"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import { paginateChunkM } from "./paginateChunkM"

/**
 * Like `unfoldChunk`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunk<S>(s: S) {
  return <A>(f: (s: S) => readonly [A.Array<A>, O.Option<S>]) =>
    paginateChunkM(s)((s) => T.succeed(f(s)))
}
