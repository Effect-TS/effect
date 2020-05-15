import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * @since 2.5.0
 */
export function keys<K extends string>(
  r: ReadonlyRecord<K, unknown>
): ReadonlyArray<K> {
  return (Object.keys(r) as any).sort()
}
