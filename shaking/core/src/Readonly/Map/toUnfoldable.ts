import type { HKT, Kind, URIS } from "fp-ts/lib/HKT"
import type { Unfoldable, Unfoldable1 } from "fp-ts/lib/Unfoldable"

import { none, some } from "../../Option"
import type { Ord } from "../../Ord"

import { toReadonlyArray } from "./toReadonlyArray"

/**
 * Unfolds a map into a list of key/value pairs
 *
 * @since 2.5.0
 */
export function toUnfoldable<K, F extends URIS>(
  O: Ord<K>,
  U: Unfoldable1<F>
): <A>(d: ReadonlyMap<K, A>) => Kind<F, readonly [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: Unfoldable<F>
): <A>(d: ReadonlyMap<K, A>) => HKT<F, readonly [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: Unfoldable<F>
): <A>(d: ReadonlyMap<K, A>) => HKT<F, readonly [K, A]> {
  const toArrayO = toReadonlyArray(O)
  return (d) => {
    const arr = toArrayO(d)
    const len = arr.length
    return U.unfold(0, (b) => (b < len ? some([arr[b], b + 1]) : none))
  }
}
