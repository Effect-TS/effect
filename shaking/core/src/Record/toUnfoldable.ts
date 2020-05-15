import type { HKT, Kind, URIS } from "fp-ts/lib/HKT"
import type { Unfoldable, Unfoldable1 } from "fp-ts/lib/Unfoldable"

import { toUnfoldable as toUnfoldable_1 } from "../Readonly/Record"

/**
 * Unfolds a record into a list of key/value pairs
 *
 * @since 2.0.0
 */
export function toUnfoldable<F extends URIS>(
  U: Unfoldable1<F>
): <K extends string, A>(r: Record<K, A>) => Kind<F, [K, A]>
export function toUnfoldable<F>(
  U: Unfoldable<F>
): <K extends string, A>(r: Record<K, A>) => HKT<F, [K, A]>
export function toUnfoldable<F>(
  U: Unfoldable<F>
): <A>(r: Record<string, A>) => HKT<F, [string, A]> {
  return toUnfoldable_1(U) as any
}
