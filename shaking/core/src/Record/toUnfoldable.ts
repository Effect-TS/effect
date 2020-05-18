import { URIS, Unfoldable1, Kind, Unfoldable, HKT } from "../Base"
import * as RR from "../Readonly/Record"

/**
 * Unfolds a record into a list of key/value pairs
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
  return RR.toUnfoldable(U) as any
}
