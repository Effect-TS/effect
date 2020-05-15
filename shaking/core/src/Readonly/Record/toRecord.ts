import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * @since 2.5.0
 */
export function toRecord<K extends string, A>(r: ReadonlyRecord<K, A>): Record<K, A> {
  return Object.assign({}, r)
}
