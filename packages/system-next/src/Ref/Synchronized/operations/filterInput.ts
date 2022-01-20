// ets_tracing: off

import type * as O from "../../../Option"
import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { filterInputEffect_ } from "./filterInputEffect"

/**
 * Filters the `set` value of the `XRef.Synchronized` with the specified
 * predicate, returning a `XRef.Synchronized` with a `set` value that
 * succeeds if the predicate is satisfied or else fails with `None`.
 */
export function filterInput_<RA, RB, EA, EB, A, A1 extends A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (a: A1) => boolean
): XSynchronized<RA, RB, O.Option<EA>, EB, A1, B> {
  return filterInputEffect_(self, (a) => T.succeedNow(f(a)))
}

/**
 * Filters the `set` value of the `XRef.Synchronized` with the specified
 * predicate, returning a `XRef.Synchronized` with a `set` value that
 * succeeds if the predicate is satisfied or else fails with `None`.
 *
 * @ets_data_first filterInput_
 */
export function filterInput<A, A1 extends A>(f: (a: A1) => boolean) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, O.Option<EA>, EB, A1, B> => filterInput_(self, f)
}
