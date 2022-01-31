import type { List } from "../definition"

/**
 * Applies a list of functions to a list of values.
 *
 * @ets fluent ets/List ap
 */
export function ap_<A, B>(fab: List<(a: A) => B>, fa: List<A>): List<B> {
  return fab.map((f) => fa.map(f)).flatten()
}

/**
 * Applies a list of functions to a list of values.
 *
 * @ets_data_first ap_
 */
export function ap<A, B>(fa: List<A>) {
  return (fab: List<(a: A) => B>): List<B> => fab.ap(fa)
}
