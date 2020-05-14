import type { HKT, Kind, URIS } from "fp-ts/lib/HKT"
import type { Unfoldable, Unfoldable1 } from "fp-ts/lib/Unfoldable"

import type { Ord } from "../Ord"
import * as RM from "../Readonly/Map/toUnfoldable"

/**
 * Unfolds a map into a list of key/value pairs
 *
 * @since 2.0.0
 */
export function toUnfoldable<K, F extends URIS>(
  O: Ord<K>,
  U: Unfoldable1<F>
): <A>(d: Map<K, A>) => Kind<F, [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: Unfoldable<F>
): <A>(d: Map<K, A>) => HKT<F, [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: Unfoldable<F>
): <A>(d: Map<K, A>) => HKT<F, [K, A]> {
  return RM.toUnfoldable(O, U) as any
}
