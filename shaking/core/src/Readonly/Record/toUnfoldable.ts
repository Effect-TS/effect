import type { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord"

import { URIS, Unfoldable1, Kind, Unfoldable, HKT } from "../../Base"
import { none, some as some_1 } from "../../Option/option"

import { toReadonlyArray } from "./toReadonlyArray"

/**
 * Unfolds a record into a list of key/value pairs
 */
export function toUnfoldable<F extends URIS>(
  U: Unfoldable1<F>
): <K extends string, A>(r: ReadonlyRecord<K, A>) => Kind<F, readonly [K, A]>
export function toUnfoldable<F>(
  U: Unfoldable<F>
): <K extends string, A>(r: ReadonlyRecord<K, A>) => HKT<F, readonly [K, A]>
export function toUnfoldable<F>(
  U: Unfoldable<F>
): <A>(r: ReadonlyRecord<string, A>) => HKT<F, readonly [string, A]> {
  return (r) => {
    const arr = toReadonlyArray(r)
    const len = arr.length
    return U.unfold(0, (b) => (b < len ? some_1([arr[b], b + 1]) : none))
  }
}
