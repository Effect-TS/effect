import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * Test whether a record is empty
 *
 * @since 2.5.0
 */
export function isEmpty(r: ReadonlyRecord<string, unknown>): boolean {
  return Object.keys(r).length === 0
}
