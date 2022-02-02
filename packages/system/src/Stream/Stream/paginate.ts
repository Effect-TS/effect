// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { paginateM } from "./paginateM"

/**
 * Like `unfoldM`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginate<S, A>(
  s: S,
  f: (s: S) => Tp.Tuple<[A, O.Option<S>]>
): Stream<unknown, never, A> {
  return paginateM(s)((s) => T.succeed(f(s)))
}
