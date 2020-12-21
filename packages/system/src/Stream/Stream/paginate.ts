import type * as A from "../../Chunk"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { paginateM } from "./paginateM"

/**
 * Like `unfoldM`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginate<S>(s: S) {
  return <A>(f: (s: S) => readonly [A, O.Option<S>]): Stream<unknown, never, A> =>
    paginateM(s)((s) => T.succeed(f(s)))
}
