import type { ReadonlyRecord } from "./ReadonlyRecord"
import { _hasOwnProperty } from "./_hasOwnProperty"

/**
 * @since 2.5.0
 */
export function hasOwnProperty<K extends string>(
  k: string,
  r: ReadonlyRecord<K, unknown>
): k is K {
  return _hasOwnProperty.call(r, k)
}
