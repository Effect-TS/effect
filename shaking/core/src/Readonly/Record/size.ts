import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * Calculate the number of key/value pairs in a record
 *
 * @since 2.5.0
 */
export function size(r: ReadonlyRecord<string, unknown>): number {
  return Object.keys(r).length
}
