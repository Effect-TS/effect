import * as A from "../../Chunk"
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
    f: (s: S) => T.Effect<R, E, readonly [A, O.Option<S>]>
  ): Stream<R, E, A> =>
    paginateChunkM(s)((_) => T.map_(f(_), ([a, s]) => [A.single(a), s] as const))
}
