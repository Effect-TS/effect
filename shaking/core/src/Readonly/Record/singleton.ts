import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * Create a record with one key/value pair
 *
 * @since 2.5.0
 */
export function singleton<K extends string, A>(k: K, a: A): ReadonlyRecord<K, A> {
  return { [k]: a } as any
}
