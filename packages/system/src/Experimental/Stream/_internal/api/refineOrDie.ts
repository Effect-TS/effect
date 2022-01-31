// ets_tracing: off

import { identity } from "../../../../Function/index.js"
import type * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as RefineOrDieWith from "./refineOrDieWith.js"

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, E, E1, A>(
  self: C.Stream<R, E, A>,
  pf: (e: E) => O.Option<E1>
): C.Stream<R, E | E1, A> {
  return RefineOrDieWith.refineOrDieWith_(self, pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 *
 * @ets_data_first refineOrDie_
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>) {
  return <R, A>(self: C.Stream<R, E, A>) => refineOrDie_(self, pf)
}
