// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { paginateM } from "./paginateM.js"

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
