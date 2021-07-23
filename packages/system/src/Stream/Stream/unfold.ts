// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import { unfoldM } from "./unfoldM"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`
 */
export function unfold<S, A>(s: S, f: (s: S) => O.Option<Tp.Tuple<[A, S]>>) {
  return unfoldM(s, (s) => T.succeed(f(s)))
}
