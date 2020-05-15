import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * @since 2.5.0
 */
export function some<A>(
  predicate: (a: A) => boolean
): (r: ReadonlyRecord<string, A>) => boolean {
  return (r) => {
    for (const k in r) {
      if (predicate(r[k])) {
        return true
      }
    }
    return false
  }
}
