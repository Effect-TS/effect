import type { Ord } from "../../Ord"

/**
 * Get a sorted array of the values contained in a map
 *
 * @since 2.5.0
 */
export function values<A>(O: Ord<A>): <K>(m: ReadonlyMap<K, A>) => ReadonlyArray<A> {
  return (m) => Array.from(m.values()).sort(O.compare)
}
