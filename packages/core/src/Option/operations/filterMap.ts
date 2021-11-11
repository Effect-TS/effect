// ets_tracing: off

import * as O from "@effect-ts/system/Option"

/**
 * Filter + Map
 *
 * @ets_data_first filterMap_
 */
export function filterMap<A, B>(f: (a: A) => O.Option<B>) {
  return (fa: O.Option<A>): O.Option<B> => filterMap_(fa, f)
}

/**
 * Filter + Map
 */
export function filterMap_<A, B>(
  fa: O.Option<A>,
  f: (a: A) => O.Option<B>
): O.Option<B> {
  return O.isNone(fa) ? O.none : f(fa.value)
}
