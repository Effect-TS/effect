import type { HKT, Kind, URIS } from "fp-ts/lib/HKT"
import type { Unfoldable, Unfoldable1 } from "fp-ts/lib/Unfoldable"

import { none, some as optionSome } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { toReadonlyArray } from "./toReadonlyArray"

/**
 * Unfolds a record into a list of key/value pairs
 *
 * @since 2.5.0
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
    return U.unfold(0, (b) => (b < len ? optionSome([arr[b], b + 1]) : none))
  }
}
