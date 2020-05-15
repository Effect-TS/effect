import type { Foldable, Foldable1, Foldable2, Foldable3 } from "fp-ts/lib/Foldable"
import type { HKT, Kind, Kind2, Kind3, URIS, URIS2, URIS3 } from "fp-ts/lib/HKT"

import type { Magma } from "../Magma"
import { fromFoldable as fromFoldable_1 } from "../Readonly/Record"

/**
 * Create a record from a foldable collection of key/value pairs, using the
 * specified `Magma` to combine values for duplicate keys.
 *
 * @since 2.0.0
 */
export function fromFoldable<F extends URIS3, A>(
  M: Magma<A>,
  F: Foldable3<F>
): <K extends string, R, E>(fka: Kind3<F, R, E, [K, A]>) => Record<K, A>
export function fromFoldable<F extends URIS2, A>(
  M: Magma<A>,
  F: Foldable2<F>
): <K extends string, E>(fka: Kind2<F, E, [K, A]>) => Record<K, A>
export function fromFoldable<F extends URIS, A>(
  M: Magma<A>,
  F: Foldable1<F>
): <K extends string>(fka: Kind<F, [K, A]>) => Record<K, A>
export function fromFoldable<F, A>(
  M: Magma<A>,
  F: Foldable<F>
): <K extends string>(fka: HKT<F, [K, A]>) => Record<K, A>
export function fromFoldable<F, A>(
  M: Magma<A>,
  F: Foldable<F>
): (fka: HKT<F, [string, A]>) => Record<string, A> {
  return fromFoldable_1(M, F)
}
