import * as O from "../../../../data/Option"
import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { collectEffect_ } from "./collectEffect"

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * partial function, returning a `XRefM` with a `get` value that succeeds
 * with the result of the partial function if it is defined or else fails
 * with `None`.
 */
export function collect_<RA, RB, EA, EB, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  pf: (b: B) => O.Option<C>
): XSynchronized<RA, RB, EA, O.Option<EB>, A, C> {
  return collectEffect_(self, (b) => O.map_(pf(b), T.succeedNow))
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * partial function, returning a `XRefM` with a `get` value that succeeds
 * with the result of the partial function if it is defined or else fails
 * with `None`.
 *
 * @ets_data_first collect_
 */
export function collect<B, C>(pf: (b: B) => O.Option<C>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EA, O.Option<EB>, A, C> => collect_(self, pf)
}
