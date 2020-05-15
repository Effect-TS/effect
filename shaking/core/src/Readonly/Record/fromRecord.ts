import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * @since 2.5.0
 */
export function fromRecord<K extends string, A>(r: Record<K, A>): ReadonlyRecord<K, A> {
  return Object.assign({}, r)
}
